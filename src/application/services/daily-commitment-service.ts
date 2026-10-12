import {
  DailyCommitmentError,
  diffTasks,
  createDailyCommitmentSummary,
  getPlannedCheckOut,
  getTodaySeoulDate,
  isValidDailyDate,
  MAX_RANGE_DAYS,
  validateDailyCheckoutInput,
  validateDailyCommitmentInput,
  validateDateRange,
  type DailyCheckoutInput,
  type DailyCommitment,
  type DailyCommitmentInput,
  type DailyCommitmentRevision,
  type PlannedCheckOut,
  type StudyTask,
} from "@/domain/daily-commitment/daily-commitment";
import { addDays } from "@/domain/weekly-schedule/weekly-schedule";
import { RecoveryError } from "@/domain/recovery/recovery";
import type { WeeklyScheduleRepository } from "@/repositories/interfaces/weekly-schedule-repository";
import type { DailyCommitmentRepository } from "@/repositories/interfaces/daily-commitment-repository";
import type { DailyCommitmentRevisionRepository } from "@/repositories/interfaces/daily-commitment-revision-repository";
import { RecoveryService } from "@/application/services/recovery-service";

export class DailyCommitmentService {
  constructor(
    private readonly commitmentRepository: DailyCommitmentRepository,
    private readonly revisionRepository: DailyCommitmentRevisionRepository,
    private readonly weeklyScheduleRepository: WeeklyScheduleRepository,
    private readonly recoveryService: RecoveryService,
  ) {}

  async get(studentId: string, date: string) {
    const [commitment, weeklySchedule] = await Promise.all([
      this.commitmentRepository.findByStudentAndDate(studentId, date),
      this.weeklyScheduleRepository.findByStudentAndWeek(
        studentId,
        getMonday(date),
      ),
    ]);
    return {
      commitment,
      plannedCheckOut: getPlannedCheckOut(weeklySchedule, date),
    };
  }

  async getRevisions(studentId: string, commitmentId: string) {
    return this.revisionRepository.findByCommitment(studentId, commitmentId);
  }

  async save(
    studentId: string,
    input: DailyCommitmentInput,
    now = new Date(),
  ): Promise<{
    commitment: DailyCommitment;
    revisions: DailyCommitmentRevision[];
    created: boolean;
    idempotent: boolean;
    plannedCheckOut: PlannedCheckOut;
  }> {
    validateDailyCommitmentInput(input, now);
    const current = await this.commitmentRepository.findByStudentAndDate(
      studentId,
      input.date,
    );
    const timestamp = now.toISOString();
    const newlyCarried = await this.validateCarriedTasks(
      studentId,
      current?.tasks ?? [],
      input.tasks,
    );

    if (!current) {
      if (
        input.expectedVersion !== undefined &&
        input.expectedVersion !== 0
      ) {
        throw new DailyCommitmentError("VERSION_CONFLICT");
      }
      const plannedCheckOut = await this.getPlannedCheckOut(studentId, input.date);
      const commitment = await this.commitmentRepository.create(
        studentId,
        input,
        timestamp,
        await this.createSummary(studentId, input.tasks, null, plannedCheckOut),
      );
      const revisions = await this.revisionRepository.createMany(
        diffTasks([], commitment.tasks, timestamp, commitment.id, studentId, input.date, 1),
      );
      await this.recordCarried(studentId, newlyCarried, input.date, timestamp);
      return {
        commitment,
        revisions,
        created: true,
        idempotent: false,
        plannedCheckOut,
      };
    }

    if (input.requestId && current.lastRequestId === input.requestId) {
      return {
        commitment: current,
        revisions: [],
        created: false,
        idempotent: true,
        plannedCheckOut: await this.getPlannedCheckOut(studentId, input.date),
      };
    }

    if (current.checkout) {
      throw new DailyCommitmentError("CHECKED_OUT");
    }

    if (
      input.expectedVersion === undefined ||
      input.expectedVersion !== current.version
    ) {
      throw new DailyCommitmentError("VERSION_CONFLICT");
    }

    const revisionsToCreate = diffTasks(
      current.tasks,
      input.tasks,
      timestamp,
      current.id,
      studentId,
      input.date,
      current.version + 1,
    );

    if (revisionsToCreate.length === 0) {
      return {
        commitment: current,
        revisions: [],
        created: false,
        idempotent: true,
        plannedCheckOut: await this.getPlannedCheckOut(studentId, input.date),
      };
    }

    const plannedCheckOut = await this.getPlannedCheckOut(studentId, input.date);
    const commitment = await this.commitmentRepository.update(
      studentId,
      input,
      timestamp,
      current.version,
      await this.createSummary(studentId, input.tasks, null, plannedCheckOut),
    );
    const revisions = await this.revisionRepository.createMany(revisionsToCreate);
    await this.recordCarried(studentId, newlyCarried, input.date, timestamp);
    return {
      commitment,
      revisions,
      created: false,
      idempotent: false,
      plannedCheckOut,
    };
  }

  async getRange(studentId: string, from: string, to: string) {
    validateDateRange(from, to);
    return this.commitmentRepository.findByStudentAndDateRange(studentId, from, to);
  }

  async checkout(studentId: string, input: DailyCheckoutInput, now = new Date()) {
    if (!isValidDailyDate(input.date)) {
      throw new DailyCommitmentError("INVALID_DATE");
    }
    const current = await this.commitmentRepository.findByStudentAndDate(
      studentId,
      input.date,
    );
    if (!current) {
      throw new DailyCommitmentError("COMMITMENT_NOT_FOUND");
    }
    validateDailyCheckoutInput(input, current.tasks, now);
    const order = new Map(current.tasks.map((task, index) => [task.id, index]));
    const results = [...input.results]
      .map((result) => ({
        taskId: result.taskId,
        status: result.status,
        reason: result.reason === null ? null : result.reason.trim(),
      }))
      .sort((a, b) => (order.get(a.taskId) ?? 0) - (order.get(b.taskId) ?? 0));
    const isResend =
      current.checkout !== null &&
      JSON.stringify(current.checkout.results) === JSON.stringify(results);
    const commitment = isResend
      ? current
      : await this.commitmentRepository.saveCheckout(studentId, input.date, {
          results,
          checkedOutAt: now.toISOString(),
        });
    await this.recoveryService.syncFromCheckouts(
      studentId,
      [commitment],
      now.toISOString(),
    );
    const plannedCheckOut = await this.getPlannedCheckOut(studentId, input.date);
    const summary = await this.createSummary(
      studentId,
      commitment.tasks,
      commitment.checkout,
      plannedCheckOut,
    );
    return this.commitmentRepository.updateSummary(studentId, input.date, summary);
  }

  async reconcileRecoveries(studentId: string, now = new Date()) {
    const to = getTodaySeoulDate(now);
    const from = addDays(to, -(MAX_RANGE_DAYS - 1));
    const commitments = await this.getRange(studentId, from, to);
    return this.recoveryService.syncFromCheckouts(
      studentId,
      commitments,
      now.toISOString(),
    );
  }

  private async validateCarriedTasks(
    studentId: string,
    currentTasks: StudyTask[],
    nextTasks: StudyTask[],
  ) {
    const carriedIds = nextTasks
      .map((task) => task.recoveryId)
      .filter((id): id is string => Boolean(id));
    if (new Set(carriedIds).size !== carriedIds.length) {
      throw new DailyCommitmentError("INVALID_TASKS");
    }
    const existing = new Set(
      currentTasks.map((task) => task.recoveryId).filter(Boolean),
    );
    const newlyCarried = nextTasks.filter(
      (task) => task.recoveryId && !existing.has(task.recoveryId),
    );
    for (const task of newlyCarried) {
      try {
        await this.recoveryService.findPending(studentId, task.recoveryId as string);
      } catch (error) {
        if (error instanceof RecoveryError) {
          throw new DailyCommitmentError("INVALID_TASKS");
        }
        throw error;
      }
    }
    return newlyCarried;
  }

  private async recordCarried(
    studentId: string,
    tasks: StudyTask[],
    date: string,
    timestamp: string,
  ) {
    for (const task of tasks) {
      await this.recoveryService.markCarried(
        studentId,
        task.recoveryId as string,
        date,
        task.id,
        timestamp,
      );
    }
  }

  private async createSummary(
    studentId: string,
    tasks: StudyTask[],
    checkout: DailyCommitment["checkout"],
    plannedCheckOut: PlannedCheckOut,
  ) {
    const pendingRecoveries = await this.recoveryService.list(studentId, "pending");
    return createDailyCommitmentSummary(
      tasks,
      checkout,
      plannedCheckOut.time,
      pendingRecoveries.length,
    );
  }

  private async getPlannedCheckOut(studentId: string, date: string) {
    const schedule = await this.weeklyScheduleRepository.findByStudentAndWeek(
      studentId,
      getMonday(date),
    );
    return getPlannedCheckOut(schedule, date);
  }
}

function getMonday(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  const day = parsed.getUTCDay();
  parsed.setUTCDate(parsed.getUTCDate() - ((day + 6) % 7));
  return parsed.toISOString().slice(0, 10);
}

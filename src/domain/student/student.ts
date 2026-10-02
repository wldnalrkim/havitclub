export type Student = {
  id: string;
  displayName: string;
};

export type StudentLookupResult =
  | { status: "not_found" }
  | { status: "found"; student: Student }
  | { status: "ambiguous" };

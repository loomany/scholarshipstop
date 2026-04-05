export type SqlClause = {
  boolean: 'and' | 'or';
  clause: string;
  sourceField: string;
};

export type SqlTranslationStub = {
  key: string;
  reason: string;
};

export type SqlTranslationResult = {
  clauses: SqlClause[];
  stubs: SqlTranslationStub[];
};

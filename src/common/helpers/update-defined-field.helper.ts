/* 
  This function takes an object and returns a new object with only the properties that are not undefined.
  It is used to update an object with only the properties that are explicitly provided.
  
*/

export const updateOnlyDefinedFields = <T extends Record<string, any>>(
  obj: T,
): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined),
  ) as Partial<T>;
};

export const createRecordId = (
  type: string,
  number: number,
  name: string,
  date: string,
  uuid: string,
): string => {
  const safeName = name.trim().replace(/\s+/g, `-`).replace(/[^a-zA-Z0-9-]/g, ``);
  return `${type}_${number}_${safeName}_${date}_${uuid}`;
};

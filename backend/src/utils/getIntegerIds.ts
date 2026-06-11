const getIntegerId = (eventId: string | string[]) => {
  const eventIdString = Array.isArray(eventId) ? eventId[0] : eventId;

  const newId = parseInt(eventIdString, 10);
  return newId;
};

export { getIntegerId };

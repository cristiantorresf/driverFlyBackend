// A utility file that exports functions to create mocks.

export const createPartnerModelMock = () => ({
  findOne: jest.fn().mockResolvedValue(null),
  save: jest.fn(),
  deleteOne: jest.fn().mockResolvedValue({ acknowledged: true })
  // Add other methods as needed
})

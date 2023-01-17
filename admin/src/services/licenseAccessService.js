import { backInstance } from './backendInstance';

export const LicenseAccessService = {
  addLicenseAccess: async (payload) => {
    await backInstance.post('/users/save-license-access', payload);
  },

  removeLicenseAccess: async (payload) => {
    await backInstance.post('/users/remove-license-access', payload);
  },

  validateLicenseAccess: async (softwareId, licenseAccessedId, token) => {
    const queryParams = `softwareId=${softwareId}&licenseAccessedId=${licenseAccessedId}&token=${token}`;
    return await backInstance.get(`/users/validate-license-access?${queryParams}`);
  }
};

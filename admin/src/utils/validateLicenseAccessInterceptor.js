import storage from './storage';

import { LicenseAccessService } from '../services/licenseAccessService';

async function validateLicenseAccessInteceptor() {
  const user = storage.getItem('userInfo');
  const token = storage.getItem('jwtToken');
  const softwareId = storage.getItem('softwareId');

  const userId = user?.id;
  const { data } = await LicenseAccessService.validateLicenseAccess(softwareId, userId, token);

  return {
    isValid: data?.isValid,
    hasData: (user && token && softwareId),
  };
}

export default validateLicenseAccessInteceptor;

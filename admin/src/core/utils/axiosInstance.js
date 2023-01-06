import axios from 'axios';
import { auth } from '@strapi/helper-plugin';

import {
  storage,
  formatUrlWithNewFilter,
  formatFilterWithEnterpriseId,
  validateUnrelatedDataServices
} from '../../utils';

const instance = axios.create({
  baseURL: process.env.STRAPI_ADMIN_BACKEND_URL,
});

instance.interceptors.request.use(
  async config => {
    const enterprise = storage.getItem('enterprise');
    const enterpriseId = enterprise?.externalId;

    if (!enterpriseId) throw new Error("Empresa não identificada.");

    const isAnUnrelatedDataServices = validateUnrelatedDataServices(config?.url);

    if (config?.method === 'post' && isAnUnrelatedDataServices) {
      const { query_column } = isAnUnrelatedDataServices;
      config.url = config?.url + formatUrlWithNewFilter(query_column, "$null", true, config?.url);
    }

    if (config?.method === 'get' || config.url.includes('/content-manager/relations')) {
      config.url = config.url + formatFilterWithEnterpriseId(enterpriseId, config?.url);
    }

    if (
      ['post', 'put'].includes(config?.method)
      && !config.url.includes('/admin/users')
      && !config.url.includes('/configuration')
    ) {
      config.data.id_empresa = enterpriseId;
    }

    const token = storage.getItem('jwtToken');

    config.headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    return config;
  },
  error => {
    Promise.reject(error);
  }
);

instance.interceptors.response.use(
  response => response,
  error => {
    // whatever you want to do with the error
    if (error?.response?.status === 401) {
      auth.clearAppStorage();
      window.location.reload();
    }

    throw error;
  }
);

export default instance;

import axios from 'axios';

import _get from 'lodash/get';
import _size from 'lodash/size';

export const EnterpriseService = {
  getEnterpriseDetails: async (token, userId) => {
    const BASE_URL = (CUSTOM_VARIABLES.NODE_ENV === 'production')
    ? 'https://kaizenlog.dailykaizenconsultoria.com.br/content-manager/collection-types'
    : 'https://kaizen-house-hml.enesolucoes.com.br/content-manager/collection-types';

    const enterpriseDetails = {
      softwareId: null,
      externalId: null
    };

    const responseEnterpriseUser = await axios.get(
      `${BASE_URL}/api::usuario-empresa.usuario-empresa?filters[$and][0][id_usuario][$eq]=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
        }
      }
    );

    const enterpriseUserDetais = _get(responseEnterpriseUser, ['data', 'results', '0']);

    if(_size(enterpriseUserDetais)) {
      const enterpriseDetailsResponse = await axios.get(
        `${BASE_URL}/api::empresa.empresa?filters[$and][0][id_login][$eq]=${enterpriseUserDetais.id_empresa}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          }
        }
      );

      const enterprise = _get(enterpriseDetailsResponse, ['data', 'results', '0']);

      enterpriseDetails.softwareId = enterprise?.id_software;
      enterpriseDetails.externalId = enterprise?.id_login;
    }

    return enterpriseDetails;
  },
};

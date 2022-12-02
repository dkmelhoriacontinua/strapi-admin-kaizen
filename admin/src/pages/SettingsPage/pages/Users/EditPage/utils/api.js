import { axiosInstance } from '../../../../../../core/utils';

const fetchUser = async id => {
  const { data } = await axiosInstance.get(`/admin/users/${id}`);

  return data.data;
};

const putUser = async (id, body) => {
  const { data } = await axiosInstance.put(`/admin/users/${id}`, body);

  return data.data;
};

const fetchPermissions = async () => {
  const { data } = await axiosInstance.get('/content-manager/collection-types/api::permissao.permissao?sort=id:ASC&pageSize=1000');
  return data.results;
};

const fetchUserPermission = async (id) => {
  const { data } = await axiosInstance.get('/content-manager/collection-types/api::usuario-permissao.usuario-permissao?sort=id:ASC&pageSize=1&&filters[$and][0][id_usuario][$eq]='+id);
  return data.results;
};

const postUserPermission = async (body) => {
  const getUserPermission = await fetchUserPermission(body.id_usuario);

  let data = null;
  if(!getUserPermission.length) {
    data = await axiosInstance.post('/content-manager/collection-types/api::usuario-permissao.usuario-permissao', body);
  } else {
    data = await axiosInstance.put('/content-manager/collection-types/api::usuario-permissao.usuario-permissao/'+getUserPermission[0].id, body );
  }
  return data;
}

const fetchUserEnterprise = async (id) => {
  const { data } = await axiosInstance.get('/content-manager/collection-types/api::usuario-empresa.usuario-empresa?sort=id:ASC&pageSize=1&filters[$and][0][id_usuario][$eq]=' + id);

  return data?.results;
}

const postUserEnterprise = async (body) => {
  const userEnterprise = await fetchUserEnterprise(body?.id_usuario);

  let data = null;
  if (!userEnterprise?.length) {
    data = await axiosInstance.post('/content-manager/collection-types/api::usuario-empresa.usuario-empresa', body);
  } else {
    data = await axiosInstance.put(
      '/content-manager/collection-types/api::usuario-empresa.usuario-empresa/' + userEnterprise[0]?.id,
      body
    );
  }

  return data;
}

const fetchFactories = async () => {
  const { data } = await axiosInstance.get('/content-manager/collection-types/api::usina.usina?page=1&pageSize=1000&sort=Nome:ASC');
  return data.results;
}

const fetchFronts = async () => {
  const { data } = await axiosInstance.get('/content-manager/collection-types/api::frente.frente?page=1&pageSize=10000');
  return data.results;
}


export {
  fetchUser,
  putUser,
  fetchPermissions,
  postUserPermission,
  fetchUserPermission,
  fetchFactories,
  fetchFronts,
  postUserEnterprise
};

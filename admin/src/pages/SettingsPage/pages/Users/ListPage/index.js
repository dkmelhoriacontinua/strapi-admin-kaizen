import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  DynamicTable,
  SearchURLQuery,
  SettingsPageTitle,
  useRBAC,
  useNotification,
  useFocusWhenNavigate,
  NoPermissions,
  request
} from '@strapi/helper-plugin';
import { ActionLayout, HeaderLayout } from '@strapi/design-system/Layout';
import { Button } from '@strapi/design-system/Button';
import { Main } from '@strapi/design-system/Main';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import Envelop from '@strapi/icons/Envelop';
import { useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import adminPermissions from '../../../../../permissions';
import TableRows from './DynamicTable/TableRows';
import Filters from './Filters';
import ModalForm from './ModalForm';
import PaginationFooter from './PaginationFooter';
import { deleteData, fetchData, fetchDataPermission, fetchDataUsersPermission } from './utils/api';
import displayedFilters from './utils/displayedFilters';
import tableHeaders from './utils/tableHeaders';
import { Box } from '@strapi/design-system/Box';
import { Loader } from '@strapi/design-system/Loader';

const ContainerLoader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
`

const ListPage = () => {
  const [isModalOpened, setIsModalOpen] = useState(false);
  const [permissionsUsers, setPermissionsUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isMaster, setIsMaster] = useState(false);

  const {
    allowedActions: { canCreate, canDelete, canRead },
  } = useRBAC(adminPermissions.settings.users);
  const queryClient = useQueryClient();
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { search } = useLocation();
  useFocusWhenNavigate();
  const { notifyStatus } = useNotifyAT();
  const queryName = ['users', search];
  const queryName2 = ['permissions', search];
  const queryName3 = ['usersPermissions', search];

  const title = formatMessage({
    id: 'Settings.permissions.users.listview.header.title',
    defaultMessage: 'Users',
  });

  const notifyLoad = () => {
    notifyStatus(
      formatMessage(
        {
          id: 'app.utils.notify.data-loaded',
          defaultMessage: 'The {target} has loaded',
        },
        { target: title }
      )
    );
  };

  useEffect(() => {

    ( async () => {
      try {
        setLoading(true)
        await findPermission();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false)
      }
    }
    )();
  }, []);

  const findPermission = async() => {
     if(permissionsUsers?.id) return null
     const { id } = JSON.parse(sessionStorage.getItem('userInfo') || {});

     const userPermission = await request('/content-manager/collection-types/api::usuario-permissao.usuario-permissao/?filters[$and][0][id_usuario][$eq]=' + id, { method: 'GET' });
     const result = userPermission.results[0]

     if (result && result.id_permissao) {
       const { results }  = await request('/content-manager/collection-types/api::permissao-menu.permissao-menu/?pageSize=1000&filters[$and][0][permissao][id][$eq]=' + result.id_permissao, { method: 'GET' });

       const findPermissionUsers = results.find(item => item.menu === 'Usuários')
       setPermissionsUsers(findPermissionUsers)

       const permissionDetail = await request('/content-manager/collection-types/api::permissao.permissao?page=1&pageSize=1&sort=id:ASC&filters[$and][0][id][$eq]='+result.id_permissao, { method: 'GET' });

       const permissionMaster = permissionDetail.results[0].Nome.toLowerCase() === 'masterdk';
       setIsMaster(permissionMaster)
     }
   }

  const { status, data, isFetching } = useQuery(queryName, () => fetchData(search, notifyLoad), {
    enabled: canRead,
    keepPreviousData: true,
    retry: false,
    staleTime: 1000 * 20,
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });

  const allPermissions = useQuery(queryName2, () => fetchDataPermission(), {
    enabled: canRead,
    keepPreviousData: true,
    retry: false,
    staleTime: 1000 * 20,
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });

  const userPermissions = useQuery(queryName3, () => fetchDataUsersPermission(), {
    enabled: canRead,
    keepPreviousData: true,
    retry: false,
    staleTime: 1000 * 20,
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });

  let idPermissionMaster = null

  if (allPermissions?.data?.length) {
    idPermissionMaster = allPermissions?.data?.find( item => item?.Nome.toLowerCase() === 'masterdk')
  }

  let newData = [];

  if (data?.length && allPermissions?.data?.length && userPermissions?.data?.length && (idPermissionMaster)) {
    newData = data?.filter(item => {
      const filterPermissionUsers = userPermissions?.data?.find(itemP => itemP.id_usuario === item.id)
      if (!filterPermissionUsers) return item
      if(!isMaster && (filterPermissionUsers.id_permissao === idPermissionMaster.id)) return null
      return item
    })
  }

  const handleToggle = () => {
    setIsModalOpen(prev => !prev);
  };

  const deleteAllMutation = useMutation(ids => deleteData(ids), {
    onSuccess: async () => {
      await queryClient.invalidateQueries(queryName);
    },
    onError: err => {
      if (err?.response?.data?.data) {
        toggleNotification({ type: 'warning', message: err.response.data.data });
      } else {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      }
    },
  });

  // This can be improved but we need to show an something to the user
  const isLoading =
    (status !== 'success' && status !== 'error') || (status === 'success' && isFetching);


  if (loading)
    return (
      <ContainerLoader>
        <Loader>loading</Loader>
      </ContainerLoader>
    )

  const createAction = permissionsUsers?.criar ? (
    <Button
      data-testid="create-user-button"
      onClick={handleToggle}
      startIcon={<Envelop />}
      size="L"
    >
      {formatMessage({
        id: 'Settings.permissions.users.create',
        defaultMessage: 'Invite new user',
      })}
    </Button>
  ) : (
    undefined
  );

  return (
    <Main aria-busy={isLoading}>
      <SettingsPageTitle name="Users" />
      <HeaderLayout
        primaryAction={createAction}
        title={title}
        subtitle={formatMessage({
          id: 'Settings.permissions.users.listview.header.subtitle',
          defaultMessage: 'All the users who have access to the Strapi admin panel',
        })}
      />
      {permissionsUsers?.listar && (
        <ActionLayout
          startActions={
            <>
              <SearchURLQuery
                label={formatMessage(
                  { id: 'app.component.search.label', defaultMessage: 'Search for {target}' },
                  { target: title }
                )}
              />
              <Filters displayedFilters={displayedFilters} />
            </>
          }
        />
      )}

      <Box paddingLeft={[10, 5, 1]} paddingRight={[10, 5, 1]}>
        {!permissionsUsers?.listar && <NoPermissions />}
        {status === 'error' && <div>TODO: An error occurred</div>}
        {permissionsUsers?.listar && (
          <>
            <DynamicTable
              contentType="Users"
              isLoading={isLoading}
              onConfirmDeleteAll={deleteAllMutation.mutateAsync}
              onConfirmDelete={id => deleteAllMutation.mutateAsync([id])}
              headers={tableHeaders}
              rows={newData}
              withBulkActions
              withMainAction={permissionsUsers?.excluir}
            >
              <TableRows
                canDelete={permissionsUsers?.excluir}
                headers={tableHeaders}
                rows={newData || []}
                withBulkActions
                withMainAction={permissionsUsers?.excluir}
              />
            </DynamicTable>
            <PaginationFooter pagination={data?.pagination} />
          </>
        )}
      </Box>
      {isModalOpened && <ModalForm onToggle={handleToggle} queryName={queryName} />}
    </Main>
  );
};

export default ListPage;

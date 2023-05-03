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

import storage from '../../../../../utils/storage';
import { backInstance } from '../../../../../services/backendInstance';

const ContainerLoader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
`

const ListPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpened, setIsModalOpen] = useState(false);
  const [permissionsUsers, setPermissionsUsers] = useState({});

  const { search } = useLocation();
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const toggleNotification = useNotification();
  const { allowedActions: {canRead } } = useRBAC(adminPermissions.settings.users);

  useFocusWhenNavigate();

  const queryName = ['users', search];

  const title = formatMessage({
    id: 'Settings.permissions.users.listview.header.title',
    defaultMessage: 'Users',
  });

  useEffect(() => {
    (async () => {
      await findPermission();
      await findAllUsers();
    }
    )();
  }, []);

  const findPermission = async () => {
    try {
      setLoading(true);

      if(permissionsUsers?.id) return null;

      const { id } = storage.getItem('userInfo') || {};

      const userPermission = await request('/content-manager/collection-types/api::usuario-permissao.usuario-permissao/?filters[$and][0][id_usuario][$eq]=' + id, { method: 'GET' });
      const result = userPermission.results[0]

      if (result && result.id_permissao) {
        const { results }  = await request('/content-manager/collection-types/api::permissao-menu.permissao-menu/?pageSize=1000&filters[$and][0][permissao][id][$eq]=' + result.id_permissao, { method: 'GET' });

        const findPermissionUsers = results.find(item => item.menu === 'Usuários')
        setPermissionsUsers(findPermissionUsers)
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const findAllUsers = async () => {
    try {
      setLoading(true);

      const response = await backInstance.get(`/users/`);
      setData(response?.data);
    } catch (error) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

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

  const handleDelete = (id) => {
    deleteAllMutation.mutateAsync([id]).then(async () => {
      await findAllUsers();
    });
  }

  const handleToggle = () => setIsModalOpen(prev => !prev);

  if (loading) {
    return (
      <ContainerLoader>
        <Loader>loading</Loader>
      </ContainerLoader>
    );
  }

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
    null
  );

  return (
    <Main aria-busy={loading}>
      <SettingsPageTitle name="Users" />

      <HeaderLayout
        primaryAction={createAction}
        title={title}
        subtitle={formatMessage({
          id: 'Settings.permissions.users.listview.header.subtitle',
          defaultMessage: 'All the users who have access to the Strapi admin panel',
        })}
      />

      {/* {permissionsUsers?.listar && (
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
      )} */}

      <Box paddingLeft={[10, 5, 1]} paddingRight={[10, 5, 1]}>
        {!permissionsUsers?.listar && <NoPermissions />}
        {permissionsUsers?.listar && (
          <>
            <DynamicTable
              contentType="Users"
              isLoading={loading}
              onConfirmDeleteAll={deleteAllMutation.mutateAsync}
              onConfirmDelete={handleDelete}
              headers={tableHeaders}
              rows={data}
              withBulkActions
              withMainAction={permissionsUsers?.excluir}
            >
            <TableRows
              rows={data}
              withBulkActions
              headers={tableHeaders}
              canDelete={permissionsUsers?.excluir}
              withMainAction={permissionsUsers?.excluir}
            />
            </DynamicTable>
            {/* <PaginationFooter pagination={data?.pagination} /> */}
          </>
        )}
      </Box>
      {isModalOpened && <ModalForm onToggle={handleToggle} queryName={queryName} />}
    </Main>
  );
};

export default ListPage;

import React, { memo, useCallback, useEffect, useRef, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { connect } from 'react-redux';
import isEqual from 'react-fast-compare';
import { bindActionCreators, compose } from 'redux';
import { useHistory, useLocation } from 'react-router-dom';
import get from 'lodash/get';
import axios from 'axios';
import { stringify } from 'qs';
import {
  NoPermissions,
  CheckPermissions,
  SearchURLQuery,
  useFocusWhenNavigate,
  useQueryParams,
  useNotification,
  useRBACProvider,
  useTracking,
  request
} from '@strapi/helper-plugin';
import Cog from '@strapi/icons/Cog';
import Eye from '@strapi/icons/Eye';
import Plus from '@strapi/icons/Plus';
import { Box } from '@strapi/design-system/Box';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import { Flex } from '@strapi/design-system/Flex';
import { Link } from '@strapi/design-system/Link';
import { Main } from '@strapi/design-system/Main';
import EyeStriked from '@strapi/icons/EyeStriked';
import { Loader } from '@strapi/design-system/Loader';
import { Button } from '@strapi/design-system/Button';
import { HeaderLayout } from '@strapi/design-system/Layout';
import { IconButton } from '@strapi/design-system/IconButton';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';

import { axiosInstance } from '../../../core/utils';
import { getRequestUrl, getTrad } from '../../utils';

import FieldPicker from './FieldPicker';
import makeSelectListView from './selectors';
import PaginationFooter from './PaginationFooter';
import DynamicTable from '../../components/DynamicTable';

import permissions from '../../../permissions';
import ModelsContext from '../../contexts/ModelsContext';
import { InjectionZone } from '../../../shared/components';
import AttributeFilter from '../../components/AttributeFilter';

import { buildQueryString } from './utils';
import storage from '../../../utils/storage';
import { getData, getDataSucceeded, onChangeListHeaders, onResetListHeaders } from './actions';

const cmPermissions = permissions.contentManager;

const IconButtonCustom = styled(IconButton)`
  svg {
    path {
      fill: ${({ theme }) => theme.colors.neutral900};
    }
  }
`;

const StartBlockActions = styled(Flex)`
  & > * + * {
    margin-left: ${({ theme }) => theme.spaces[2]};
  }
  margin-left: ${({ pullRight }) => (pullRight ? 'auto' : undefined)};
`;

const EndBlockActions = styled(StartBlockActions)`
  flex-shrink: 0;
`;

const ActionLayout = ({ startActions, endActions }) => {
  return startActions || endActions ? (
    <Box paddingLeft={[10, 8, 1]} paddingRight={[10, 8, 0]}>
      <Box paddingBottom={4}>
        <Flex justifyContent="space-between" alignItems="flex-start">
          {startActions && <StartBlockActions wrap="wrap">{startActions}</StartBlockActions>}
          {endActions && <EndBlockActions pullRight>{endActions}</EndBlockActions>}
        </Flex>
      </Box>
    </Box>
  ) : null;
};

/* eslint-disable react/no-array-index-key */
function ListView({
  data,
  getData,
  getDataSucceeded,
  isLoading,
  layout,
  pagination,
  slug,
}) {
  const { total } = pagination;
  const {
    contentType: {
      metadatas,
      settings: { bulkable, filterable: isFilterable, searchable: isSearchable },
    },
  } = layout;

  const [canRead, setCanRead] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [canCreate, setCanCreate] = useState(false)
  const [isBulkable, setIsBulkable] = useState(false)
  const [loading, setLoading] = useState(true)
  const { hiddenContentManager, handleToggleAsideBar, isCurrentMobile } = useContext(ModelsContext);

  useEffect(() => {
    const getData = async () => {

      const userInfo = storage.getItem('userInfo') || {};

      try {
        setLoading(true)
        const { results } = await request('/content-manager/collection-types/api::usuario-permissao.usuario-permissao?page=1&pageSize=1000&sort=id:ASC&filters[$and][0][id_usuario][$eq]='+userInfo.id, { method: 'GET' });

        const id_permissao = results[0].id_permissao
        const permissao_menu = await request('/content-manager/collection-types/api::permissao-menu.permissao-menu?page=1&pageSize=1000&sort=menu:ASC&filters[$and][0][permissao][id][$eq]='+id_permissao, { method: 'GET' });

        const findOption = await permissao_menu.results && permissao_menu.results.length && permissao_menu.results.find((item) => item.menu === layout.contentType.info.singularName);

        setCanCreate(findOption?.criar)
        setCanDelete(findOption?.excluir)
        setCanRead(findOption?.listar)
        setIsBulkable(findOption?.editar)

        setLoading(false)

      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: 'app.containers.App.notification.error.init' },
        });
      }

    };

    getData();

  }, []);

  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const { refetchPermissions } = useRBACProvider();
  const trackUsageRef = useRef(trackUsage);
  const fetchPermissionsRef = useRef(refetchPermissions);
  const { notifyStatus } = useNotifyAT();

  const headerElement = document.getElementsByClassName('eqvhmO');

  useFocusWhenNavigate();

  const [{ query }] = useQueryParams();
  const params = buildQueryString(query);
  const pluginsQueryParams = stringify({ plugins: query.plugins }, { encode: false });

  const { pathname } = useLocation();
  const { push } = useHistory();
  const { formatMessage } = useIntl();
  const contentType = layout.contentType;
  const hasDraftAndPublish = get(contentType, 'options.draftAndPublish', false);

  // FIXME
  // Using a ref to avoid requests being fired multiple times on slug on change
  // We need it because the hook as mulitple dependencies so it may run before the permissions have checked
  const requestUrlRef = useRef('');

  const fetchData = useCallback(
    async (endPoint, source) => {
      getData();

      try {
        const opts = source ? { cancelToken: source.token } : null;

        const {
          data: { results, pagination: paginationResult },
        } = await axiosInstance.get(endPoint, opts);

        notifyStatus(
          formatMessage(
            {
              id: getTrad('utils.data-loaded'),
              defaultMessage:
                '{number, plural, =1 {# entry has} other {# entries have}} successfully been loaded',
            },
            // Using the plural form
            { number: paginationResult.count }
          )
        );

        getDataSucceeded(paginationResult, results);
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }

        const resStatus = get(err, 'response.status', null);

        if (resStatus === 403) {
          await fetchPermissionsRef.current();

          toggleNotification({
            type: 'info',
            message: { id: getTrad('permissions.not-allowed.update') },
          });

          push('/');

          return;
        }

        console.error(err);
        toggleNotification({
          type: 'warning',
          message: { id: getTrad('error.model.fetch') },
        });
      }
    },
    [formatMessage, getData, getDataSucceeded, notifyStatus, push, toggleNotification]
  );

  const handleConfirmDeleteAllData = useCallback(
    async ids => {
      try {
        await axiosInstance.post(getRequestUrl(`collection-types/${slug}/actions/bulkDelete`), {
          ids,
        });

        const requestUrl = getRequestUrl(`collection-types/${slug}${params}`);
        fetchData(requestUrl);
        trackUsageRef.current('didBulkDeleteEntries');
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: getTrad('error.record.delete') },
        });
      }
    },
    [fetchData, params, slug, toggleNotification]
  );

  const handleConfirmDeleteData = useCallback(
    async idToDelete => {
      try {
        await axiosInstance.delete(getRequestUrl(`collection-types/${slug}/${idToDelete}`));

        const requestUrl = getRequestUrl(`collection-types/${slug}${params}`);
        fetchData(requestUrl);

        toggleNotification({
          type: 'success',
          message: { id: getTrad('success.record.delete') },
        });
      } catch (err) {
        const errorMessage = get(
          err,
          'response.payload.message',
          formatMessage({ id: getTrad('error.record.delete') })
        );

        toggleNotification({
          type: 'warning',
          message: errorMessage,
        });
      }
    },
    [slug, params, fetchData, toggleNotification, formatMessage]
  );

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const shouldSendRequest = canRead;
    const requestUrl = getRequestUrl(`collection-types/${slug}${params}`);

    if (shouldSendRequest && requestUrl.includes(requestUrlRef.current)) {
      fetchData(requestUrl, source);
    }

    return () => {
      requestUrlRef.current = slug;

      source.cancel('Operation canceled by the user.');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead, getData, slug, params, getDataSucceeded, fetchData]);

  const defaultHeaderLayoutTitle = formatMessage({
    id: getTrad('header.name'),
    defaultMessage: 'Content',
  });
  const headerLayoutTitle = formatMessage({
    id: contentType.info.displayName,
    defaultMessage: contentType.info.displayName || defaultHeaderLayoutTitle,
  });

  const subtitle = canRead
    ? formatMessage(
        {
          id: getTrad('pages.ListView.header-subtitle'),
          defaultMessage: '{number, plural, =0 {# entries} one {# entry} other {# entries}} found',
        },
        { number: total }
      )
    : null;

  const getCreateAction = props =>
    canCreate ? (
      <Button
        {...props}
        onClick={() => {
          const trackerProperty = hasDraftAndPublish ? { status: 'draft' } : {};

          trackUsageRef.current('willCreateEntry', trackerProperty);
          push({
            pathname: `${pathname}/create`,
            search: query.plugins ? pluginsQueryParams : '',
          });
        }}
        startIcon={<Plus />}
      >
        {isCurrentMobile
          ? 'Novo'
          : formatMessage({
          id: getTrad('HeaderLayout.button.label-add-entry'),
          defaultMessage: 'Create new entry',
        })}
      </Button>
    ) : null;

  const handleShiftPadding = (paddingLeft, paddingRight) => {
    if (headerElement && headerElement.length) {
      headerElement[0].style.paddingRight = paddingRight;
      headerElement[0].style.paddingLeft = paddingLeft;
    }
  };

  if (isCurrentMobile) {
    handleShiftPadding(hiddenContentManager ? '200px' : '8px', '8px');
  } else {
    handleShiftPadding('56px', '56px');
  }

  if (!canRead && loading) {
    return <Loader>loading</Loader>
  }

  const secondaryAction = isCurrentMobile ? (
    <Button
      variant="tertiary"
      onClick={handleToggleAsideBar}
      startIcon={hiddenContentManager ? <EyeStriked/> : <Eye />}
    >
      Barra lateral
    </Button>
  ) : <></>;

  return (
    <Main aria-busy={isLoading}>
      <HeaderLayout
        primaryAction={getCreateAction()}
        // secondaryAction={secondaryAction}
        subtitle={subtitle}
        title={headerLayoutTitle}
        navigationAction={
          <Link startIcon={<ArrowLeft />} to="/content-manager/">
            {formatMessage({
              id: 'app.components.HeaderLayout.link.go-back',
              defaultMessage: 'Back',
            })}
          </Link>
        }
      />
      {!canRead && (
        <ActionLayout endActions={<InjectionZone area="contentManager.listView.actions" />} />
      )}
      {canRead && (
        <ActionLayout
          endActions={ !isCurrentMobile &&
            <>
              <InjectionZone area="contentManager.listView.actions" />
              <FieldPicker layout={layout} />
              <CheckPermissions permissions={cmPermissions.collectionTypesConfigurations}>
                <Box paddingTop={1} paddingBottom={1}>
                  <IconButtonCustom
                    onClick={() => {
                      trackUsage('willEditListLayout');

                      push({ pathname: `${slug}/configurations/list`, search: pluginsQueryParams });
                    }}
                    icon={<Cog />}
                    label={formatMessage({
                      id: 'app.links.configure-view',
                      defaultMessage: 'Configure the view',
                    })}
                  />
                </Box>
              </CheckPermissions>
            </>
          }
          startActions={hiddenContentManager
            ? secondaryAction
            : <Box paddingTop={[0, 0, 3]}>
              {isSearchable && (
                <SearchURLQuery
                  label={formatMessage(
                    { id: 'app.component.search.label', defaultMessage: 'Search for {target}' },
                    { target: headerLayoutTitle }
                  )}
                  placeholder={formatMessage({
                    id: 'app.component.search.placeholder',
                    defaultMessage: 'Search...',
                  })}
                  trackedEvent="didSearch"
                />
              )}
              {isFilterable && (
                <AttributeFilter contentType={contentType} slug={slug} metadatas={metadatas} />
              )}
              {secondaryAction}
            </Box>
          }
        />
      )}
      <Box paddingLeft={[10, 5, 1]} paddingRight={[10, 5, 2]}>
        {canRead ? (
          <>
            <DynamicTable
              canCreate={canCreate}
              canDelete={canDelete}
              contentTypeName={headerLayoutTitle}
              onConfirmDeleteAll={handleConfirmDeleteAllData}
              onConfirmDelete={handleConfirmDeleteData}
              isBulkable={isBulkable}
              isLoading={isLoading}
              // FIXME: remove the layout props drilling
              layout={layout}
              rows={data}
              action={getCreateAction({ variant: 'secondary' })}
            />
            <PaginationFooter pagination={{ pageCount: pagination?.pageCount || 1 }} />
          </>
        ) : (
          ((!canRead && !loading) && <NoPermissions />)
        )}
      </Box>
    </Main>
  );
}

ListView.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  canDelete: PropTypes.bool.isRequired,
  canRead: PropTypes.bool.isRequired,
  data: PropTypes.array.isRequired,
  layout: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      info: PropTypes.shape({ displayName: PropTypes.string.isRequired }).isRequired,
      layouts: PropTypes.shape({
        list: PropTypes.array.isRequired,
        editRelations: PropTypes.array,
      }).isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
  isLoading: PropTypes.bool.isRequired,
  getData: PropTypes.func.isRequired,
  getDataSucceeded: PropTypes.func.isRequired,
  pagination: PropTypes.shape({ total: PropTypes.number.isRequired, pageCount: PropTypes.number })
    .isRequired,
  slug: PropTypes.string.isRequired,
};

const mapStateToProps = makeSelectListView();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
      getDataSucceeded,
      onChangeListHeaders,
      onResetListHeaders,
    },
    dispatch
  );
}
const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps
);

export default compose(withConnect)(memo(ListView, isEqual));

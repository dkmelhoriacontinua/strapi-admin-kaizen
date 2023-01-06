import React, { useMemo, useState, useEffect} from 'react';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import pick from 'lodash/pick';
import get from 'lodash/get';
import omit from 'lodash/omit';
import {
  Form,
  GenericInput,
  SettingsPageTitle,
  useAppInfos,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  LoadingIndicatorPage,
} from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import { Formik } from 'formik';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Link } from '@strapi/design-system/Link';
import { Typography } from '@strapi/design-system/Typography';
import { Checkbox } from '@strapi/design-system/Checkbox';
import { Main } from '@strapi/design-system/Main';
import { Stack } from '@strapi/design-system/Stack';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import Check from '@strapi/icons/Check';
import MagicLink from 'ee_else_ce/pages/SettingsPage/pages/Users/components/MagicLink';
import { formatAPIErrors, getFullName } from '../../../../../utils';
import { fetchUser, putUser, fetchPermissions, postUserPermission, fetchUserPermission, fetchFactories, fetchFronts } from './utils/api';
import layout from './utils/layout';
import { editValidation } from '../utils/validations/users';
import { Select, Option } from '@strapi/design-system/Select';
import { makeSelectModelLinks } from '../../../../../content-manager/pages/App/selectors';
import { useSelector, shallowEqual } from 'react-redux';
import storage from '../../../../../utils/storage';

const fieldsToPick = ['email', 'firstname', 'lastname', 'username', 'isActive', 'roles', 'permission'];

const EditPage = ({ canUpdate }) => {

  const { formatMessage } = useIntl();
  const [permission, setPermission] = useState(null);
  const [permissionUserLogged, setPermissionUserLogged] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    params: { id },
  } = useRouteMatch('/settings/users/:id');
  const { push } = useHistory();
  const { setUserDisplayName } = useAppInfos();

  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  useFocusWhenNavigate();
  const [factoriesSelected, setFactoriesSelected] = useState([])
  const [frontsSelecteds, setFrontsSelecteds] = useState([])

  const permissions = useQuery(['permissao'], () => fetchPermissions())

  const getFactories = useQuery(['usinas'], () => fetchFactories())

  const getFronts = useQuery(['fronts'], () => fetchFronts())

  const modelLinksSelector = useMemo(makeSelectModelLinks, []);
  const { collectionTypeLinks, singleTypeLinks } = useSelector(
    state => modelLinksSelector(state),
    shallowEqual
  );

  const { status, data } = useQuery(['user', id], () => fetchUser(id), {
    retry: false,
    keepPreviousData: false,
    staleTime: 1000 * 20,
    onError: err => {
      const status = err.response.status;

      // Redirect the use to the homepage if is not allowed to read
      if (status === 403) {
        toggleNotification({
          type: 'info',
          message: {
            id: 'notification.permission.not-allowed-read',
            defaultMessage: 'You are not allowed to see this document',
          },
        });

        push('/');
      }
    },
  });

  useEffect(() => {

    ( async () => {
      try {
        setLoading(true)
        const userInfos = storage.getItem('userInfo') || {};
        fetchUserPermission(userInfos.id).then((res) => {
          setPermissionUserLogged(res[0].id_permissao)
        });
      } catch (err) {
      console.error(err);
      } finally {
        setLoading(false)
      }
    }
    )();
  }, []);

  if (!permission) {
    fetchUserPermission(id).then((res) => {
      setPermission(res[0]?.id_permissao)
      if (res[0]?.usinas && res[0]?.usinas.length) setFactoriesSelected(res[0]?.usinas)
      if (res[0]?.frentes && res[0]?.frentes.length) setFrontsSelecteds(res[0]?.frentes)
    });
  }

  const onChangeFronts = (value, id) => {
    if (value) return setFrontsSelecteds(prevArray => [...prevArray, id])
    const filtered = frontsSelecteds.filter(item => item !== id)
    setFrontsSelecteds(filtered)
  }

  const onChangeFactories = (value, id) => {
    if (value) return setFactoriesSelected(prevArray => [...prevArray, id])
    const filtered = factoriesSelected.filter(item => item !== id)
    setFactoriesSelected(filtered)
  }

  const onChangeAllFronts = (value) => {
    if (value) {
      getFronts.data.map(item => {
        const filtered = frontsSelecteds.filter(front => front === item.id)
        if(!filtered.length) return setFrontsSelecteds(prevArray => [...prevArray, item.id])
      })
      return
    }
    setFrontsSelecteds([])
  }

   const onChangeAllFactories = (value) => {
    if (value) {
      getFactories.data.map(item => {
        const filtered = factoriesSelected.filter(factory => factory === item.id)
        if(!filtered.length) return setFactoriesSelected(prevArray => [...prevArray, item.id])
      })
      return
    }
    setFactoriesSelected([])
  }

  const handleSubmit = async (body, actions) => {
    lockApp();

    try {
      body.roles = [1];
      const data = await putUser(id, omit(body, ['confirmPassword', 'permission']));

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
      });

      const frentes = JSON.stringify(frontsSelecteds);
      const usinas = JSON.stringify(factoriesSelected);

      const userInfos = storage.getItem('userInfo') || {};
      await postUserPermission({ id_usuario: id, id_permissao: body.permission, frentes, usinas });

      // The user is updating himself
      if (id.toString() === userInfos.id.toString()) {
        storage.setItem('userInfo' , data);

        const userDisplayName = get(body, 'username') || getFullName(body.firstname, body.lastname);

        setUserDisplayName(userDisplayName);
      }
      actions.setValues(pick(body, fieldsToPick));
    } catch (err) {
      // FIXME when API errors are ready
      const errors = formatAPIErrors(err.response.data);
      const fieldsErrors = Object.keys(errors).reduce((acc, current) => {
        acc[current] = errors[current].id;

        return acc;
      }, {});

      actions.setErrors(fieldsErrors);
      toggleNotification({
        type: 'warning',
        message: get(err, 'response.data.message', 'notification.error'),
      });
    }

    unlockApp();
  };

  const isLoading = status !== 'success';
  const headerLabel = isLoading
    ? { id: 'app.containers.Users.EditPage.header.label-loading', defaultMessage: 'Edit user' }
    : { id: 'app.containers.Users.EditPage.header.label', defaultMessage: 'Edit {name}' };

  const initialData = Object.keys(pick(data, fieldsToPick)).reduce((acc, current) => {
    if (current === 'roles') {
      acc[current] = (data?.roles || []).map(({ id }) => id);

      return acc;
    }

    acc[current] = data?.[current];

    return acc;
  }, {});

  const headerLabelName =
    initialData.username || getFullName(initialData.firstname, initialData.lastname);

  const title = formatMessage(headerLabel, { name: headerLabelName });

  const valueAll = () => {
    var result = getFactories.data.filter(function(item){ return factoriesSelected.indexOf(item.id) > -1});
    return getFactories.data.length === result.length
  }


  const indeterminateFactories = () => {
    var result = getFactories.data.filter(function(item){ return factoriesSelected.indexOf(item.id) > -1});
    return factoriesSelected.length > 0 && result.length < getFactories.data.length
  }

  const valueAllFronts = () => {
    var result = getFronts.data.filter(function(item){ return frontsSelecteds.indexOf(item.id) > -1});
    return getFronts.data.length === result.length
  }

  const indeterminateFronts = () => {
    var result = getFronts.data.filter(function(item){ return frontsSelecteds.indexOf(item.id) > -1});
    return frontsSelecteds.length > 0 && result.length < getFronts.data.length
  }

  let permissionMaster = null
  if(permissions && permissions.data && permissions.data.length) {
    permissionMaster = permissions.data.find(item => item.Nome.toLowerCase() === 'masterdk');
  }

  if (isLoading || loading) {
    return (
      <Main aria-busy="true">
        <SettingsPageTitle name="Users" />
        <HeaderLayout
          primaryAction={
            <Button disabled startIcon={<Check />} type="button" size="L">
              {formatMessage({ id: 'form.button.save', defaultMessage: 'Save' })}
            </Button>
          }
          title=""
          navigationAction={
            <Link startIcon={<ArrowLeft />} to="/settings/users?pageSize=10&page=1&sort=firstname">
              {formatMessage({
                id: 'app.components.go-back',
                defaultMessage: 'Back',
              })}
            </Link>
          }
        />
        <ContentLayout>
          <LoadingIndicatorPage />
        </ContentLayout>
      </Main>
    );
  }

  return (
    <Main>
      <SettingsPageTitle name="Users" />
      <Formik
        onSubmit={handleSubmit}
        initialValues={initialData}
        validateOnChange={false}
        validationSchema={editValidation}
      >
        {({ errors, values, handleChange, isSubmitting }) => {
          return (
            <Form>
              <HeaderLayout
                primaryAction={
                  <Button
                    disabled={isSubmitting || !canUpdate}
                    startIcon={<Check />}
                    loading={isSubmitting}
                    type="submit"
                    size="L"
                  >
                    {formatMessage({ id: 'form.button.save', defaultMessage: 'Save' })}
                  </Button>
                }
                title={title}
                navigationAction={
                  <Link
                    startIcon={<ArrowLeft />}
                    to="/settings/users?pageSize=10&page=1&sort=firstname"
                  >
                    {formatMessage({
                      id: 'app.components.go-back',
                      defaultMessage: 'Back',
                    })}
                  </Link>
                }
              />
               <Box paddingRight={[10, 5, 1]} paddingLeft={[10, 5, 1]}>
                {data?.registrationToken && (
                  <Box paddingBottom={6}>
                    <MagicLink registrationToken={data.registrationToken} />
                  </Box>
                )}
                <Stack size={7}>
                  <Box
                    background="neutral0"
                    hasRadius
                    shadow="filterShadow"
                    paddingTop={6}
                    paddingBottom={6}
                    paddingLeft={7}
                    paddingRight={7}
                  >
                    <Stack size={4}>
                      <Typography variant="delta" as="h2">
                        {formatMessage({
                          id: 'app.components.Users.ModalCreateBody.block-title.details',
                          defaultMessage: 'Details',
                        })}
                      </Typography>
                      <Grid gap={5}>
                        {layout.map(row => {
                          return row.map(input => {
                            return (
                              <GridItem key={input.name} {...input.size}>
                                <GenericInput
                                  {...input}
                                  disabled={!canUpdate}
                                  error={errors[input.name]}
                                  onChange={handleChange}
                                  value={values[input.name] || ''}
                                  autocomplete="off"
                                />
                              </GridItem>
                            );
                          });
                        })}
                      </Grid>
                    </Stack>
                  </Box>
                  <Box
                    background="neutral0"
                    hasRadius
                    shadow="filterShadow"
                    paddingTop={6}
                    paddingBottom={6}
                    paddingLeft={7}
                    paddingRight={7}
                  >
                    <Stack size={4}>
                      <Typography variant="delta" as="h2">
                        {formatMessage({
                          id: 'app.components.Users.ModalCreateBody.block-title.login',
                          defaultMessage: "User's role",
                        })}
                      </Typography>
                      <Grid gap={5}>
                        {(permissions.data && permissions.data.length) &&
                          <GridItem col={6} xs={12}>
                            <Select
                              label="Permission"
                              name="permission"
                              value={values.permission || permission}
                              onChange={v => {
                                handleChange({ target: { name: 'permission', value: v } });
                              }}
                            >
                            {
                              permissions.data.map(item => {
                                if(item.Nome.toLowerCase() === 'masterdk') {
                                  if(permissionMaster && permissionMaster.id === permissionUserLogged)
                                    return (
                                      <Option value={item.id}>{item.Nome}</Option>
                                    )
                                } else {
                                  return (
                                    <Option value={item.id}>{item.Nome}</Option>
                                  )
                                }
                              })
                            }
                            </Select>
                          </GridItem>
                        }

                        {(getFactories.data && getFactories.data.length) &&
                          <GridItem col={12} xs={12}>
                            <GridItem col={12} xs={12} padding={1}>
                              <Typography variant="delta" as="h3">Usinas</Typography>
                            </GridItem>
                            <Grid>
                              <GridItem col={12} xs={12} padding={1}>
                                  <Checkbox
                                    onValueChange={(e) => onChangeAllFactories(e)}
                                    value={ valueAll() }
                                    indeterminate={indeterminateFactories()}
                                  >
                                    <span>Todas</span>
                                  </Checkbox>
                              </GridItem>
                              {
                                getFactories.data.map(item => {
                                  const hasItem = factoriesSelected.filter(factory => factory === item.id)
                                  return (
                                    <GridItem col={6} xs={6} padding={1} style={{ borderTop: '1px solid #e3e3e3' }}>
                                        <Checkbox
                                          value={!!hasItem.length}
                                          onValueChange={(e) => onChangeFactories(e, item.id)}
                                        >
                                          <span>{item.Nome}</span>
                                        </Checkbox>
                                    </GridItem>
                                  )
                                })
                              }
                            </Grid>
                          </GridItem>
                        }

                        {(getFronts.data && getFronts.data.length) &&
                          <GridItem col={12} xs={12}>
                            <GridItem col={12} xs={12} padding={1}>
                              <Typography variant="delta" as="h3">Frentes</Typography>
                            </GridItem>
                            <Grid>
                              <GridItem col={12} xs={12} padding={1}>
                                  <Checkbox
                                    onValueChange={(e) => onChangeAllFronts(e)}
                                    value={ valueAllFronts() }
                                    indeterminate={indeterminateFronts()}
                                  >
                                    <span>Todas</span>
                                  </Checkbox>
                                </GridItem>
                              {
                                getFronts.data.map(item => {
                                  if (item.id_frente_original) return null
                                  const hasItem = frontsSelecteds.filter(front => front === item.id)
                                  return (
                                    <GridItem col={6} xs={6} padding={1} style={{ borderTop: '1px solid #e3e3e3' }}>
                                      <Checkbox value={!!hasItem.length} onValueChange={(e) => onChangeFronts(e, item.id)}>
                                        <span>{item.Nome}</span>
                                      </Checkbox>
                                    </GridItem>
                                  )
                                })
                              }
                            </Grid>
                          </GridItem>
                        }
                      </Grid>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </Form>
          );
        }}
      </Formik>
    </Main>
  );
};

EditPage.propTypes = {
  canUpdate: PropTypes.bool.isRequired,
};

export default EditPage;

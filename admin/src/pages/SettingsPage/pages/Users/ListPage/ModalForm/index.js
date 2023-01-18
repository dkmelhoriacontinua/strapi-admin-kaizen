import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import {
  ModalLayout,
  ModalHeader,
  ModalFooter,
  ModalBody,
} from '@strapi/design-system/ModalLayout';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Breadcrumbs, Crumb } from '@strapi/design-system/Breadcrumbs';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { Checkbox } from '@strapi/design-system/Checkbox';
import styled from 'styled-components';
import { Formik } from 'formik';
import {
  Form,
  GenericInput,
  useNotification,
  useOverlayBlocker,
  LoadingIndicatorPage,
  translatedErrors
} from '@strapi/helper-plugin';
import { useQueryClient, useMutation } from 'react-query';
import formDataModel from 'ee_else_ce/pages/SettingsPage/pages/Users/ListPage/ModalForm/utils/formDataModel';
import roleSettingsForm from 'ee_else_ce/pages/SettingsPage/pages/Users/ListPage/ModalForm/utils/roleSettingsForm';
import MagicLink from 'ee_else_ce/pages/SettingsPage/pages/Users/components/MagicLink';
import { axiosInstance } from '../../../../../../core/utils';
import layout from './utils/layout';
import stepper from './utils/stepper';
import * as yup from 'yup';

import { storage } from '../../../../../../utils';


import {
  fetchPermissions,
  postUserPermission,
  fetchFactories,
  fetchFronts,
  fetchUserPermission,
  postUserEnterprise
} from '../../EditPage/utils/api';
import { useQuery } from 'react-query';
import { Select, Option } from '@strapi/design-system/Select';
import omit from 'lodash/omit';

const schema = yup.object().shape({
  firstname: yup.string().required(translatedErrors.required),
  lastname: yup.string(),
  email: yup
    .string()
    .email(translatedErrors.email)
    .required(translatedErrors.required),
});

const ModalLayoutStyled = styled(ModalLayout)`
    @media only screen and (max-width: 47.9375rem) {
      width: 100%;
      height: 100%;
    }
`;

const ModalForm = ({ queryName, onToggle }) => {
  const [currentStep, setStep] = useState('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permission, setPermission] = useState();
  const [factoriesSelected, setFactoriesSelected] = useState([])
  const [frontsSelecteds, setFrontsSelecteds] = useState([])
  const [registrationToken, setRegistrationToken] = useState(null);
  const queryClient = useQueryClient();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();

  const listPermissions = useQuery(['permissao'], () => fetchPermissions())
  const getFactories = useQuery(['usinas'], () => fetchFactories())
  const getFronts = useQuery(['fronts'], () => fetchFronts())

  const postMutation = useMutation(body => axiosInstance.post('/admin/users',  omit(body, 'permission')), {
    onSuccess: async ({ data }) => {
      setRegistrationToken(data.data.registrationToken);

      const frentes = JSON.stringify(frontsSelecteds);
      const usinas = JSON.stringify(factoriesSelected);

      const enterprise = storage.getItem('enterprise');
      const enterpriseId = enterprise?.externalId;

      if (!enterpriseId) throw new Error("Empresa não identificada.");

      await postUserPermission({
        id_usuario: data.data.id,
        id_permissao: permission,
        frentes, usinas
      });

      await postUserEnterprise({
        id_usuario: data.data.id,
        id_empresa_sis_login: enterpriseId
      });

      await queryClient.invalidateQueries(queryName);
      goNext();
      setIsSubmitting(false);
    },
    onError: err => {
      setIsSubmitting(false);

      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });

      throw err;
    },
    onSettled: () => {
      unlockApp();
    },
  });

  const headerTitle = formatMessage({
    id: 'Settings.permissions.users.create',
    defaultMessage: 'Invite new user',
  });

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

  const handleSubmit = async (body, { setErrors }) => {
    lockApp();
    setIsSubmitting(true);

    try {
      body.roles = [1];
      await postMutation.mutateAsync(body);
    } catch (err) {
      unlockApp();

      if (err?.response?.data.message === 'Email already taken') {
        setErrors({ email: err.response.data.message });
      }
    }
  };

  const goNext = () => {
    if (next) {
      setStep(next);
    } else {
      onToggle();
    }
  };

  const { buttonSubmitLabel, isDisabled, next } = stepper[currentStep];
  const endActions =
    currentStep === 'create' ? (
      <Button type="submit" loading={isSubmitting}>
        {formatMessage(buttonSubmitLabel)}
      </Button>
    ) : (
      <Button type="button" loading={isSubmitting} onClick={onToggle}>
        {formatMessage(buttonSubmitLabel)}
      </Button>
    );

  let permissionMaster = null
  let id_permissao = null

  if(listPermissions && listPermissions?.data?.length) {
    const {id} = storage.getItem('userInfo') || {};
    fetchUserPermission(id).then((res) => {
      id_permissao = res[0]?.id_permissao
    });

    permissionMaster = listPermissions?.data.find(item => item.Nome.toLowerCase() === 'masterdk');
  }

  return (
    <ModalLayoutStyled onClose={onToggle} labelledBy="title">
      <ModalHeader>
        <Breadcrumbs label={headerTitle}>
          <Crumb>{headerTitle}</Crumb>
        </Breadcrumbs>
      </ModalHeader>
      <Formik
        initialValues={formDataModel}
        onSubmit={handleSubmit}
        validationSchema={schema}
        validateOnChange={false}
      >
        {({ errors, handleChange, values }) => {
          return (
            <Form>
              <ModalBody>
                <Stack size={6}>
                  {currentStep !== 'create' && <MagicLink registrationToken={registrationToken} />}
                  <Box>
                    <Typography variant="beta" as="h2">
                      {formatMessage({
                        id: 'app.components.Users.ModalCreateBody.block-title.details',
                        defaultMessage: 'User details',
                      })}
                    </Typography>
                    <Box paddingTop={4}>
                      <Stack size={1}>
                        <Grid gap={5}>
                          {layout.map(row => {
                            return row.map(input => {
                              return (
                                <GridItem key={input.name} {...input.size}>
                                  <GenericInput
                                    {...input}
                                    disabled={isDisabled}
                                    error={errors[input.name]}
                                    onChange={handleChange}
                                    value={values[input.name]}
                                  />
                                </GridItem>
                              );
                            });
                          })}
                        </Grid>
                      </Stack>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="beta" as="h2">
                      {formatMessage({
                        id: 'app.components.Users.ModalCreateBody.block-title.login',
                        defaultMessage: "User's role",
                      })}
                    </Typography>
                    <Box paddingTop={4}>
                      <Grid gap={5}>
                        {roleSettingsForm.map(row => {
                          return row.map(input => {
                            return (
                              <GridItem key={input.name} {...input.size}>
                                <GenericInput
                                  {...input}
                                  disabled={isDisabled}
                                  onChange={handleChange}
                                  value={values[input.name]}
                                />
                              </GridItem>
                            );
                          });
                        })}

                      {(listPermissions.data && listPermissions.data.length) &&
                        <GridItem col={6} xs={12}>
                          <Select
                            label="Permission"
                            name="permission"
                            value={values.permission}
                            onChange={v => {
                              handleChange({ target: { name: 'permission', value: v } });
                              setPermission(v)
                            }}
                          >
                          {
                            listPermissions.data.map(item => {
                              if(item.Nome.toLowerCase() === 'masterdk') {
                                if(permissionMaster && (permissionMaster.id === permission))
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

                      {(getFactories.status === 'loading' || getFronts.status === 'loading') &&
                        <LoadingIndicatorPage />
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
                                  value={ factoriesSelected.length === getFactories.data.length }
                                  indeterminate={factoriesSelected.length > 0 && factoriesSelected.length < getFactories.data.length}
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
                                  value={ frontsSelecteds.length === getFronts.data.length }
                                  indeterminate={frontsSelecteds.length > 0 && frontsSelecteds.length < getFronts.data.length}
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
                    </Box>
                  </Box>
                </Stack>
              </ModalBody>
              <ModalFooter
                startActions={
                  <Button variant="tertiary" onClick={onToggle} type="button">
                    {formatMessage({
                      id: 'app.components.Button.cancel',
                      defaultMessage: 'Cancel',
                    })}
                  </Button>
                }
                endActions={endActions}
              />
            </Form>
          );
        }}
      </Formik>
    </ModalLayoutStyled>
  );
};

ModalForm.propTypes = {
  onToggle: PropTypes.func.isRequired,
  queryName: PropTypes.array.isRequired,
};

export default ModalForm;

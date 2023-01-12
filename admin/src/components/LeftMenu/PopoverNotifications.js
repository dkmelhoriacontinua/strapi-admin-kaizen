import React, { useEffect, useState } from 'react';
import { Tabs, Tab, TabPanels, TabPanel } from '@strapi/design-system/Tabs';
import { EmptyStateLayout } from '@strapi/design-system/EmptyStateLayout';
import { Button } from '@strapi/design-system/Button';
import get from 'lodash/get';
import omit from 'lodash/omit';
import EmptyDocuments from '@strapi/icons/EmptyDocuments';
import Refresh from '@strapi/icons/Refresh';
import { DismissibleLayer } from './DismissibleLayer';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import { Portal } from '@strapi/design-system/Portal';
import { Loader } from '@strapi/design-system/Loader';
import { Flex } from '@strapi/design-system/Flex';
import { useHistory } from 'react-router-dom';
import { useNotification } from '@strapi/helper-plugin';

import { backInstance } from '../../services/backendInstance';

import {
  TabGroupStyled,
  Popover,
  ContainerNot,
  Title,
  Author,
  ContainerButton,
  ButtonStyled,
  SpanBold,
  ContainerTitle,
  TitleRed,
  ButtonOk,
  WrapperContentNotification,
  LoadMoreButton
} from './styled'

function formatDate(date) {
  return new Date(date).toLocaleString('pt-BR').substring(0, 16).replace(' ', ' - ');
}

function formatTimeString(date) {
  if (date && (date.length <= 8)) { return date };
  return new Date(date).toTimeString();
}

const ReminderNotication = props => {
  const {
    notification_id,
    factory_name,
    front_name,
    equipment_name,
    summary_reminder_notification,
    dispatchAction,
    isOpenedTab,
    time_type,
    onDismiss,
    amount_load
  } = props;

  const [loading, setLoading] = useState(false);
  const { push, location: { pathname } } = useHistory();

  const defaultDateValue = new Date().toISOString();
  const stopDate = formatDate(get(summary_reminder_notification, 'stop_date', defaultDateValue));
  const returnDate = formatDate(get(summary_reminder_notification, 'return_date', defaultDateValue));

  function toggleLoading() { setLoading(prev => !prev); }

  function handleClick() {
    dispatchAction && dispatchAction(notification_id, toggleLoading);
  }

  function handleClickEdit() {
    const path = '/plugins/controle-frentes';
    const id_frente = get(props, 'front_id');
    const payload = {
      front: id_frente,
      factory: get(props, 'factory_id'),
      id: notification_id,
      id_tipo_equipamento: get(props, 'equipment_type_id'),
      motivo: get(summary_reminder_notification, 'reason'),
      id_equipamento: get(props, 'equipment_id'),
      id_quantidade_carga: get(summary_reminder_notification, 'amount_load_id'),
      qtd_carga: amount_load,
      id_frente,
      data_atualizacao: get(props, 'updated_at') || get(props, 'created_at'),
      hora_atualizacao: get(props, 'created_at'),
      duracao: null,
      hora_retorno: get(summary_reminder_notification, 'return_date'),
      hora_prevista_parada: formatTimeString(get(summary_reminder_notification, 'stop_date')),
      hora_prevista_retorno: formatTimeString(get(summary_reminder_notification, 'return_date')),
      parada: true,
      qtd_equipamentos_parada: get(summary_reminder_notification, 'number_tractors_stop'),
      qtd_equipamentos_retorno: get(summary_reminder_notification, 'number_tractors_return'),
      qtd_equipamentos: null,
      id_referencia: null,
      created_at: get(props, 'created_at'),
      updated_at: get(props, 'updated_at'),
      created_by_id: get(props, 'updater_user.id'),
      updated_by_id: get(props, 'creator_user.id'),
      integrado: false,
      username_created: get(props,'creator_user.firstname'),
      username_updated: get(props,'updater_user.firstname'),
      reason: get(summary_reminder_notification, 'reason'),
      isQtyTractor: true,
      hour: null,
      loading_time: null
    };

    sessionStorage.setItem('contentEditFromNotification', JSON.stringify(payload));
    document.dispatchEvent(new Event('eventEditNotifications', { bubbles: true, composed: true }));

    !pathname.includes(path) && push(path);
    onDismiss();
  }

  return (
    <ContainerNot>
      <ContainerTitle>
        <img style={{ width: '35px' }} src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAADAUlEQVRoge2Zu2sUURTGfytqiM9E8JG1sPBBiqhoApIUgk3AjQ+wFAVRbGwNCPEfsFHYQgtjY6MQtFCRVQhYCG7cCKIQFWKwCGpQUbNrIhZxLe65zLg7E3cz994ZYT+4zHLmzPnON/cxZ++FBiJhCzAEfJI2BGyNNaMFYDtQBMoVrSj3/hvcQyV+G0gDG4FbYrsfY151Q/dGm8+2TmylWDKqEX1AAfgB5PGGUiW0fUR8C0DGUY7/RB/Vc0G3bp9f9zx+iRAzikrmLNAKnAYmxTYHXJQ2J7ZJ8WmVZ8rAU+dZB0DPh+U+2zIgS/Wbz8o9jRV4q1nsKKCS6Ucl1gNcAaapFjIt93rEt58E9UiG8LGfB45Iy4f4/Ab2O886BBnUW50BxoALQEeAX4fcGxPfERIkIghdwGCAPQvsdZxLJIR9Rz6KfcNCgi6KklGSYFvIbiCHWpG+AXct80XGTuABqrT4AjwETgKzhK9alYg0tExgE8HfBd10lZuW34kQ0gUMo4ZJCbgjrYwqxVuA9cBVvIT9VW4bCRCyjeA/RLrt8PmuITzh2IUMClEOWCst50tsZYV/YoW8FaJOn61znsScCllch29aruM+23iQo6CAqpWcoB4hzXL1l9VFwhPeExLHqcAghA0JU2iUKNAQkjwkUcgpYKlNAtuT/RJqNdN/g1fZIrItBFSZ80J4HmFpxLgQAqrwnBCuozYIXAkBOC5cwzaCuxTSIlwzQMp0cJdCAL4LX0stzklcfjWa5PrLdGCXPbJZuD7X+kBSe+SgXJ/YCO6qR1LAS+E6YYPAlZDDwvMVtStvHK6E6KOIc7YISkJg5S0JDgnHB/4+9DGKN1Rv+5hECngmHGcscQBwTUgGLMU/IPEngCWWOADoFaIpzA+vZuCVxD9mOHYgHgvZTczWQJcl7iiOvm3tqH1fLSZqzzQB1/EKRFvzLxD78Aq6KeA8sIvaRa1G7VAOAO8lziwxnRe24w2zqO056nwlVvSiNrdfow55akn8J/AOuIGqqYzMiT+RzDI13BdEYgAAAABJRU5ErkJggg==" />
        <TitleRed>Lembrete de validação</TitleRed>
      </ContainerTitle>
      <details open={isOpenedTab}>
        <summary>{factory_name} - {front_name} - {equipment_name}</summary>
        <p>
          <SpanBold>Parada: </SpanBold> <time dateTime={stopDate}>{stopDate}</time> /&nbsp;
          <SpanBold>Retorno: </SpanBold> <time dateTime={stopDate}>{returnDate}</time>
        </p>
        {(amount_load && (time_type !== 'colhedora')) && <p><SpanBold>Capacidade de carga: </SpanBold>{amount_load}</p>}
      </details>
      {
        isOpenedTab && (
          <ContainerButton>
            <ButtonStyled disabled={loading} onClick={handleClickEdit}>Alterar</ButtonStyled>
            <ButtonOk onClick={handleClick} loading={loading}>Ok, manter</ButtonOk>
          </ContainerButton>
        )
      }
    </ContainerNot>
  );
};

const BreakingNotification = ({
  notification_id,
  factory_name,
  front_name,
  equipment_name,
  updater_user,
  creator_user,
  summary_update_notification,
  updated_at,
  created_at,
  dispatchAction,
  isOpenedTab,
  time_type,
  amount_load
}) => {
  const [loading, setLoading] = useState(false);

  function toggleLoading() { setLoading(prev => !prev); }

  function handleClick() {
    dispatchAction && dispatchAction(notification_id, toggleLoading)
  }

  const insertedByFirst = get(updater_user, 'firstname') || get(creator_user, 'firstname');
  const insertedBySecond = get(updater_user, 'lastname') || get(creator_user, 'lastname');
  const defaultDate = new Date().toISOString();
  const nonStop = formatDate(get(summary_update_notification, 'date', defaultDate));
  const duration = formatTimeString(get(summary_update_notification, 'duration', defaultDate)).substring(0, 5);
  const motive = get(summary_update_notification, 'reason', null);

  return (
    <ContainerNot>
      <Title>Atualização de tempos - {formatDate(updated_at || created_at)}</Title>
      <Author>Inserido por {insertedByFirst}&nbsp;{insertedBySecond}</Author>
      <details open={isOpenedTab}>
        <summary>{factory_name} - {front_name} - {equipment_name}</summary>
        <p>
          <SpanBold>Não parada </SpanBold>
          <time dateTime={nonStop}> - {nonStop}</time> / <SpanBold>Tempo de carregamento: </SpanBold>
          <time>{duration}</time>
        </p>
        {motive && <p><SpanBold>Motivo: </SpanBold>{motive}</p>}
        {(amount_load && (time_type !== 'colhedora')) && <p><SpanBold>Capacidade de carga: </SpanBold>{amount_load}</p>}
      </details>
      {
        isOpenedTab && (
          <ContainerButton>
            <ButtonStyled onClick={handleClick} loading={loading}>Concluído</ButtonStyled>
          </ContainerButton>
        )
      }
    </ContainerNot>
  );
};


const WrapperNotification = ({
 content = {},
 isLoading,
 noContentLayout,
 requestNotifications,
 dispatchAction,
 isOpenedTab,
 onDismiss
}) => {
  const data = get(content, 'data', []);
  const total = get(content, 'total', []);
  const isNextPage = get(content, 'isNextPage', false);

  function renderListNotifications() {
    return data.map(notification => {
      const isBreakingNotification = get(notification, 'notification_type', '').toLowerCase() === 'atualizacao';
      const pickContent = Object.assign({
          onDismiss,
          isOpenedTab,
          total,
          key: notification.notification_id,
          dispatchAction
        },
        omit(notification, [isBreakingNotification ? 'summary_reminder_notification' : 'summary_update_notification'])
      );
      const Component = isBreakingNotification ? BreakingNotification : ReminderNotication;

      return <Component {...pickContent} />
    });
  }
  const commonRuleToRefresh = (( data.length < total));
  const isOpenWithNextPage = isOpenedTab && isNextPage;
  const noNotifications = !data.length;

  return (
    <WrapperContentNotification color="neutral800" padding={4} background="neutral0">
      { (isLoading && noNotifications)
        ? <Flex justifyContent="center" paddingTop={10}><Loader/></Flex>
        : (isOpenedTab ? (!isNextPage && noNotifications) : noNotifications)
          ? noContentLayout
          :
            <>
              {renderListNotifications()}
              {(isOpenWithNextPage || commonRuleToRefresh) && (
                <LoadMoreButton
                  variant="secondary"
                  startIcon={<Refresh/>}
                  loading={isLoading}
                  onClick={requestNotifications}
                >
                  Buscar mais
                </LoadMoreButton>
              )}
            </>
      }
    </WrapperContentNotification>
  );
}

const PopoverNotifications = ({ onDismiss = () => {}}) => {
  const [tab, setTab] = useState(0);
  const [content, setContent] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { id } = JSON.parse(sessionStorage.getItem('userInfo') || {});
  const toggleNotification = useNotification();

  useEffect(() => {
    (requestNotifications)();
  }, [tab]);


  function getCalcPagination() {
    const isFetchingFarReminders = (!tab && get(content, 'isNextPage', false));
    const thereIsContent = get(content, 'data.length', 0);
    const currentPage = get(content, 'currentPage');

    if (isFetchingFarReminders) {
      return currentPage + (thereIsContent ? 1 : 0);
    }

    return !thereIsContent ? 1 : currentPage + 1;
  }

  async function requestNotifications() {
    try {
      !isLoading && toggleLoading();
      const type = tab ? 'closed' : 'open';
      const page = getCalcPagination();
      const response = await backInstance.get(`/notifications/${type}?page=${page}&pageSize=10&userId=${id}`);

      if (response.data) {
        if (get(response, 'data.currentPage') > get(content, 'currentPage')) {
          const oldNotifications = content.data;
          const newNotifications = Object.create(response.data);
          newNotifications.data = oldNotifications.concat(newNotifications.data);
          setContent(newNotifications);
          return;
        }
        setContent(response.data);
      }

    } catch (err) {
      console.error(err);
      toggleNotification({
        type: 'warning',
        lockTransition: false,
        message: `\t\t ao obter as notificações ${tab ? 'abertas' : 'concluídas'}.`
      });
    } finally {
      toggleLoading();
    }
  }

  async function requestActionNotification(notificationId, toggleLoading = () => {}) {

    const message = '\t\t ao concluir a notificação!';

    try {
      toggleLoading();
      const response = await backInstance.patch(`/notifications/${notificationId}/close?userId=${id}`);
      if (response.status == 200) {
        setContent(prev => {
          const data = prev.data.filter(({ notification_id }) => notification_id !== notificationId);
          delete prev['data'];
          return Object.assign({ data }, prev);
        });

        toggleNotification({type: 'success', message});
        document && document.dispatchEvent(new Event('newNotification', { bubbles: true, composed: true }));
      }
    } catch (err) {
      console.error(err);
      toggleNotification({type: 'warning', message});
    } finally {
      toggleLoading();
    }
  }

  function toggleLoading() { setIsLoading(prev => !prev); }

  function toggleTab(tabbing) {
    setContent({});
    setTab(tabbing)
  }

  const noContentLayout = (
    <EmptyStateLayout
      content={`Você não possui notificações ${tab ? 'concluídas' : 'em aberto'}!`}
      hasRadius
      icon={<EmptyDocuments width="10rem" />}
      shadow="tableShadow"
      action={<Button variant="secondary" startIcon={<Refresh />} onClick={requestNotifications}>Recarregar</Button>}
    />
  );

  const commonProps = {
    content,
    isLoading,
    noContentLayout,
    requestNotifications,
    dispatchAction: requestActionNotification,
    isOpenedTab: !tab,
    onDismiss
  };

  return (
    <Portal>
      <FocusTrap onEscape={onDismiss}>
        <DismissibleLayer onEscapeKeyDown={onDismiss} onPointerDownOutside={onDismiss}>
        <Popover id="notifications" role="janela de diálogo suspensa" aria-modal={true}>
          <TabGroupStyled
            id="tabs"
            label="Abas de notificações"
            onTabChange={toggleTab}
          >
            <Tabs>
              <Tab>Abertas</Tab>
              <Tab>Concluídas</Tab>
            </Tabs>
            <TabPanels>
              <TabPanel>
                {!tab && <WrapperNotification {...commonProps}/>}
              </TabPanel>
              <TabPanel>
                {tab && <WrapperNotification {...commonProps}/>}
              </TabPanel>
            </TabPanels>
          </TabGroupStyled>
          </Popover>
        </DismissibleLayer>
      </FocusTrap>
    </Portal>
  );
};

export default PopoverNotifications;

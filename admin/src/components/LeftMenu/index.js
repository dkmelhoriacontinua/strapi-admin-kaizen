import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import Lock from '@strapi/icons/Lock';
import Exit from '@strapi/icons/Exit';
import Users from '@strapi/icons/Users';
import Write from  '@strapi/icons/Write';
import { auth, usePersistentState, useAppInfos } from '@strapi/helper-plugin';
import { Divider } from '@strapi/design-system/Divider';
import {
  MainNav,
  NavBrand,
  NavSections,
  NavLink,
  NavSection,
  NavUser,
  NavCondense,
} from '@strapi/design-system/MainNav';
import { Stack } from '@strapi/design-system/Stack';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import { Typography } from '@strapi/design-system/Typography';

import MenuLinkBadge from './MenuLinkBadge';
import PopoverNotifications from './PopoverNotifications';

import storage from '../../utils/storage';
import useConfigurations from '../../hooks/useConfigurations';
import useModels from '../../content-manager/pages/App/useModels';

import { LicenseAccessService } from '../../services/licenseAccessService';

import {
  LinkUserWrapper,
  LinkUser,
  Container,
} from './styled'
import { LoadingIndicatorPage, request, useNotification } from '@strapi/helper-plugin';


const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks, setMenuCondensed }) => {
  const buttonRef = useRef();
  const [userLinksVisible, setUserLinksVisible] = useState(false);
  const { menuLogo } = useConfigurations();
  const [condensed, setCondensed] = usePersistentState('navbar-condensed', true);
  const { userDisplayName } = useAppInfos();
  const { formatMessage } = useIntl();
  const [isLoading, setIsLoading] = useState(true);
  const [permissaoMenu, setPermissaoMenu] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [visible, setVisible] = useState(false);
  const [hasNot, seHasNot] = useState(false);
  const [collectionType, setCollectionType] = useState([]);
  const [filteredGeneralSection, setFilteredGeneralSection] = useState([])
  const [filteredPluginSection, setFilteredPluginSection] = useState([])
  const [hasPermission, setHasPermission] = useState([])
  const [hasPermissionUsers, setHasPermissionUsers] = useState([])
  const [isMaster, setIsMaster]= useState(false)

  const toggleNotification = useNotification();

  const { collectionTypeLinks } = useModels();

  useEffect(() => {
    ( async () => {
      let permission = permissaoMenu
      if (collectionTypeLinks.length && !collectionType.length) {
        if(!permissaoMenu.length) permission = await findPermission();

        const collectionTypeLinksFiltered = await collectionTypeLinks.filter((link) => {
          const linkName = link.name.split(".");
          const findLink2 = permission && permission.find(item => item.menu === linkName[1]);

          if(findLink2?.listar) return (findLink2);
        });

        setCollectionType(collectionTypeLinksFiltered)
      }
    }
    )();
  }, [collectionTypeLinks]);

  useEffect(() => {
    ( async () => {
        try {
          setCondensed(true)
          const permissions = !permissaoMenu.length ? await findPermission() : permissaoMenu;

          let listPlugins = JSON.parse(sessionStorage.getItem('pluginsSectionLinks') || []);

          listPlugins = listPlugins.filter(item =>
            item.to !== '/plugins/upload' &&
            item.to !== '/plugins/permissoes'
          );

          const pluginsPermitidos = []
          listPlugins.forEach(item => {
            if (item?.intlLabel?.defaultMessage === 'Ajustes Kaizen-log') {
              const itemsMenu = permissions.filter(itemT => (
                itemT.menu === item.intlLabel.defaultMessage && itemT?.listar
              ));

              if (itemsMenu.length) {
                const itemFormatted = item.intlLabel.id.split('.');
                pluginsPermitidos.push(itemFormatted[0]);
              }

              return;
            }

            const itemsMenu = permissions.filter(itemT => itemT.menu === item.intlLabel.defaultMessage)

            if(itemsMenu.length || item.to === '/plugins/chamados') {
              const itemFormatted = item.intlLabel.id.split('.');
              pluginsPermitidos.push(itemFormatted[0]);
            }
          })

          if (!permissions) {
            toggleNotification({
              type: 'warning',
              lockTransition: true,
              message: user ? user.blocked ? ' usuário com perfil de acesso bloqueado.' : ' usuário sem papel de acesso vinculado.': ' usuário sem perfil de acesso cadastrado em Dados.',
            });
            return;
          }

          setPlugins(pluginsPermitidos)


          const filteredPluginsSectionLinks = pluginsSectionLinks.filter(({to}) => pluginsPermitidos.includes(to.substring(9)));
          setFilteredPluginSection(filteredPluginsSectionLinks)

          const filteredGeneralSectionLinks = isMaster ? [generalSectionLinks[generalSectionLinks.length - 1]] : [];
          setFilteredGeneralSection(filteredGeneralSectionLinks)

          const hasPermissionUsersPlugin = permissions.filter(item => item.menu === 'Usuários' && item.listar === true)
          setHasPermissionUsers(hasPermissionUsersPlugin)

          const hasPermissionPlugin = permissions.filter(item => item.menu === 'Permissões' && item.listar === true)
          setHasPermission(hasPermissionPlugin)

          const hasNotifications = filteredPluginsSectionLinks.find(item => item.to === '/plugins/notificacoes')
          seHasNot(hasNotifications)

        } catch (err) {
            toggleNotification({
            type: 'warning',
            lockTransition: true,
            message: ' verifique seu perfil de acesso cadastrado em Dados ou Configurações.'
          });
          console.error(err);

        } finally {
          setIsLoading(false);
        }
      }

    )();
  }, []);

  const findPermission = async() => {
    if(permissaoMenu.length) return null
    const { id } = storage.getItem('userInfo') || {};

    const userPermission = await request('/content-manager/collection-types/api::usuario-permissao.usuario-permissao/?filters[$and][0][id_usuario][$eq]=' + id, { method: 'GET' });
    const result = userPermission.results[0]

    if (result && result.id_permissao) {
      const { results }  = await request('/content-manager/collection-types/api::permissao-menu.permissao-menu/?pageSize=1000&filters[$and][0][permissao][id][$eq]=' + result.id_permissao, { method: 'GET' });
      setPermissaoMenu(results)

      const permissionDetail = await request('/content-manager/collection-types/api::permissao.permissao?page=1&pageSize=1&sort=id:ASC&filters[$and][0][id][$eq]='+ result.id_permissao, { method: 'GET' });

      const permissionMaster = permissionDetail.results[0].Nome.toLowerCase() === 'masterdk';

      setIsMaster(permissionMaster)

      return results
    }
    return null
  }


  const initials = userDisplayName
    .split(' ')
    .map(name => name.substring(0, 1))
    .join('')
    .substring(0, 2);

  const handleToggleUserLinks = () => setUserLinksVisible(prev => !prev);

  const removeLicenseAccess = async (user, softwareId, enterpriseId) => {
    const payload = {
      softwareId,
      enterpriseId,
      licenseAccessedId: String(user?.id),
    };

    await LicenseAccessService.removeLicenseAccess(payload);
  }

  const handleLogout = async () => {
    const user = storage.getItem('userInfo') || {};
    const enterprise = storage.getItem('enterprise');
    const softwareId = storage.getItem('softwareId');

    handleToggleUserLinks();

    await removeLicenseAccess(user, softwareId, enterprise?.externalId);

    auth.clearAppStorage();
  };

  const handleBlur = e => {
    if (
      !e.currentTarget.contains(e.relatedTarget) &&
      e.relatedTarget?.parentElement?.id !== 'main-nav-user-button'
    ) {
      setUserLinksVisible(false);
    }
  };

  const menuTitle = formatMessage({
    id: 'app.components.LeftMenu.navbrand.title',
    defaultMessage: 'Strapi Dashboard',
  });

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const handleToggleNotification = (event) => {
    event && event.preventDefault()
    setVisible(s => !s)
  }

  return (
    <div>
      {visible && <PopoverNotifications onDismiss={handleToggleNotification}/>}
      <MainNav condensed={condensed}>
        <NavBrand
          workplace={formatMessage({
            id: 'app.components.LeftMenu.navbrand.workplace',
            defaultMessage: 'Workplace',
          })}
          title={menuTitle}
          icon={<img src={menuLogo} alt={menuTitle} />}
        />

        <Divider />
        <Container>
          <NavSections id="navsections">
            <MenuLinkBadge onClick={handleToggleNotification} info={hasNot} />

            {(collectionType.length > 0) ? (
              <NavLink to="/content-manager" icon={<Write/>}>
                {formatMessage({id: 'content-manager.plugin.name', defaultMessage: 'Content manager'})}
              </NavLink>
            ) : null}

            {filteredPluginSection.length > 0 ? (
              <NavSection label="Plugins">
                {filteredPluginSection.map(link => {

                  if (link.to === '/plugins/notificacoes' || (link.to === '/plugins/content-type-builder' && !isMaster)) {
                    return null
                  }

                  const Icon = link.icon;
                  const hasAbas = permissaoMenu.filter(item => (item.menu === link.intlLabel.defaultMessage) && item.aba)

                  if(hasAbas.length) {
                    const canList = hasAbas.filter(item => item.listar)
                    if (!canList.length) return null
                  }

                  return (
                    <NavLink to={link.to} key={link.to} icon={<Icon />}>
                      {formatMessage(link.intlLabel)}
                    </NavLink>
                  );
                })}
              </NavSection>
            ) : null}


          {(hasPermissionUsers.length || hasPermission.length) ? (
            <NavSection label="Controle de acesso">
              {hasPermissionUsers.length ? <NavLink to="/settings/users" icon={<Users/>}>Usuários</NavLink>  : null}
              {hasPermission.length ? <NavLink to="/plugins/permissoes" icon={<Lock/>}>Permissões</NavLink>  : null}
            </NavSection>
          ) : null}

          {filteredGeneralSection.length > 0 ? (
            <NavSection label="General">
              {filteredGeneralSection.map(link => {
                const LinkIcon = link.icon;

                return (
                  <NavLink
                    badgeContent={
                      (link.notificationsCount > 0 && link.notificationsCount.toString()) || undefined
                    }
                    to={link.to}
                    key={link.to}
                    icon={<LinkIcon />}
                  >
                    {formatMessage(link.intlLabel)}
                  </NavLink>
                );
              })}
            </NavSection>
          ) : null}
          </NavSections>
        </Container>

        <NavUser
          id="main-nav-user-button"
          ref={buttonRef}
          onClick={handleToggleUserLinks}
          initials={initials}
          style={{ background: 'white' }}
        >
          {userDisplayName}
        </NavUser>
        {userLinksVisible && (
          <LinkUserWrapper
            onBlur={handleBlur}
            padding={1}
            shadow="tableShadow"
            background="neutral0"
            hasRadius
            style={{ background: 'white' }}
          >
            <FocusTrap onEscape={handleToggleUserLinks}>
              <Stack size={0}>
                <LinkUser tabIndex={0} onClick={handleToggleUserLinks} to="/me">
                  <Typography>
                    {formatMessage({
                      id: 'app.components.LeftMenu.profile',
                      defaultMessage: 'Profile',
                    })}
                  </Typography>
                </LinkUser>
                <LinkUser tabIndex={0} onClick={handleLogout} logout="logout" to="/auth/login">
                  <Typography textColor="danger600">
                    {formatMessage({
                      id: 'app.components.LeftMenu.logout',
                      defaultMessage: 'Logout',
                    })}
                  </Typography>
                  <Exit />
                </LinkUser>
              </Stack>
            </FocusTrap>
          </LinkUserWrapper>
        )}

        <NavCondense onClick={() => {setCondensed(s => !s); setMenuCondensed(s => !s)}}>
          {condensed
            ? formatMessage({
                id: 'app.components.LeftMenu.expand',
                defaultMessage: 'Expand the navbar',
              })
            : formatMessage({
                id: 'app.components.LeftMenu.collapse',
                defaultMessage: 'Collapse the navbar',
              })}
        </NavCondense>
      </MainNav>
    </div>
  );
};

LeftMenu.propTypes = {
  generalSectionLinks: PropTypes.array.isRequired,
  pluginsSectionLinks: PropTypes.array.isRequired,
};

export default LeftMenu;

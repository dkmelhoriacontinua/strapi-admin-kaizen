/**
 *
 * LeftMenu
 *
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  SubNav,
  SubNavHeader,
  SubNavSection,
  SubNavSections,
  SubNavLink,
} from '@strapi/design-system/SubNav';
import { useSelector, shallowEqual } from 'react-redux';
import { useIntl } from 'react-intl';
import matchSorter from 'match-sorter';
import sortBy from 'lodash/sortBy';
import toLower from 'lodash/toLower';
import getTrad from '../../../utils/getTrad';
import { makeSelectModelLinks } from '../selectors';

import {
  request,
} from '@strapi/helper-plugin';

const matchByTitle = (links, search) =>
  matchSorter(links, toLower(search), { keys: [item => toLower(item.title)] });

const LeftMenu = () => {
  const [search, setSearch] = useState('');
  const [permissaoMenu, setPermissaoMenu] = useState([])
  const [isMaster, setIsMaster] = useState(false)
  const { formatMessage } = useIntl();
  const modelLinksSelector = useMemo(makeSelectModelLinks, []);
  const { collectionTypeLinks, singleTypeLinks } = useSelector(
    state => modelLinksSelector(state),
    shallowEqual
  );

  useEffect(() => {
    const getData = async () => {

      const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || {});

      try {

        const { results } = await request('/content-manager/collection-types/api::usuario-permissao.usuario-permissao?page=1&pageSize=1000&sort=id:ASC&filters[$and][0][id_usuario][$eq]='+userInfo.id, { method: 'GET' });

        const id_permissao = results[0].id_permissao
        const permissao_menu = await request('/content-manager/collection-types/api::permissao-menu.permissao-menu?page=1&pageSize=1000&sort=menu:ASC&filters[$and][0][permissao][id][$eq]='+id_permissao, { method: 'GET' });

        setPermissaoMenu(permissao_menu.results)

        const permissionDetail = await request('/content-manager/collection-types/api::permissao.permissao?page=1&pageSize=1000&sort=id:ASC&filters[$and][0][id][$eq]='+id_permissao, { method: 'GET' });

        const permissionMaster = permissionDetail.results[0].Nome.toLowerCase() === 'masterdk';

        setIsMaster(permissionMaster);

      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: 'app.containers.App.notification.error.init' },
        });
      }

    };

    getData();

  }, []);

  sessionStorage.setItem('collectionLinksDados2', JSON.stringify(collectionTypeLinks));
  const toIntl = links =>
    links.map(link => {
      return {
        ...link,
        title: formatMessage({ id: link.title, defaultMessage: link.title }),
      };
    });

  if (!sessionStorage.getItem('collectionLinksDados')) {
    const titleLinks = collectionTypeLinks.map(link => ({ id: link.title, value: link.title }));
    sessionStorage.setItem('collectionLinksDados', JSON.stringify(sortBy(titleLinks, ['value'])));
  }

  const omitMenus = isMaster ? [] : [
    'alocacao-van',
    'caminhoes-r',
    'chamado',
    'historico-frente',
    'integracao',
    'notificacao',
    'plugin-aba',
    'quantidade-carga',
    'tipo-equipamento',
    'troca-de-turno',
    'permissao',
    'permissao-menu',
    'usuario-permissao',
    'tempos-bkp',
    'equipamento-status-bkp',
    'usina',
    'empresa',
    'usuario-empresa',
  ]

  const collectionTypeLinksFiltered = collectionTypeLinks.filter((link) => {
    const linkName = link.name.split(".")

    const omitMenu = omitMenus.includes(linkName[1])

    const findLink2 = permissaoMenu && permissaoMenu.find(item => item.menu === linkName[1]);

    if(findLink2 && (findLink2.listar) && !omitMenu) {
      return (findLink2)
    }
  });

  const intlCollectionTypeLinks = toIntl(collectionTypeLinksFiltered);

  const menu = [
    {
      id: 'collectionTypes',
      title: {
        id: getTrad('components.LeftMenu.collection-types'),
        defaultMessage: 'Collection Types',
      },
      searchable: true,
      links: sortBy(matchByTitle(intlCollectionTypeLinks, search), object =>
        object.title.toLowerCase()
      ),
    },
  ];

  const handleClear = () => {
    setSearch('');
  };

  const handleChangeSearch = ({ target: { value } }) => {
    setSearch(value);
  };

  const label = formatMessage({
    id: getTrad('header.name'),
    defaultMessage: 'Content',
  });

  return (
    <SubNav ariaLabel={label}>
      <SubNavHeader
        label={label}
        searchable
        value={search}
        onChange={handleChangeSearch}
        onClear={handleClear}
        searchLabel={formatMessage({
          id: 'content-manager.components.LeftMenu.Search.label',
          defaultMessage: 'Search for a content type',
        })}
      />
      <SubNavSections>
        {menu.map(section => {
          const label = formatMessage(
            { id: section.title.id, defaultMessage: section.title.defaultMessage },
            section.title.values
          );

          return (
            <SubNavSection
              key={section.id}
              label={label}
              badgeLabel={section.links.length.toString()}
            >
              {section.links.map(link => {
                const search = link.search ? link.search : '';

                return (
                  <SubNavLink key={link.uid} to={link.to+'?'+search}>
                  <span style={{ textTransform: 'capitalize' }}>{link.title}</span>
                  </SubNavLink>
                );
              })}
            </SubNavSection>
          );
        })}
      </SubNavSections>
    </SubNav>
  );
};

export default LeftMenu;

/**
 *
 * Admin
 *
 */

import React, { Suspense, useEffect, useMemo, lazy, useState } from 'react';
import { Switch, Route } from 'react-router-dom';
// Components from @strapi/helper-plugin
import { useTracking, LoadingIndicatorPage, useStrapiApp } from '@strapi/helper-plugin';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import LeftMenu from '../../components/LeftMenu';
import AppLayout from '../../layouts/AppLayout';
import { useMenu } from '../../hooks';
import { createRoute } from '../../utils';

const CM = lazy(() =>
  import(/* webpackChunkName: "content-manager" */ '../../content-manager/pages/App')
);
const HomePage = lazy(() => import(/* webpackChunkName: "Admin_homePage" */ '../HomePage'));
const InstalledPluginsPage = lazy(() =>
  import(/* webpackChunkName: "Admin_pluginsPage" */ '../InstalledPluginsPage')
);
const MarketplacePage = lazy(() =>
  import(/* webpackChunkName: "Admin_marketplace" */ '../MarketplacePage')
);
const NotFoundPage = lazy(() => import('../NotFoundPage'));
const InternalErrorPage = lazy(() => import('../InternalErrorPage'));

const ProfilePage = lazy(() =>
  import(/* webpackChunkName: "Admin_profilePage" */ '../ProfilePage')
);
const SettingsPage = lazy(() =>
  import(/* webpackChunkName: "Admin_settingsPage" */ '../SettingsPage')
);

const UserPage = lazy(() =>
  import(/* webpackChunkName: "admin-users" */ '../SettingsPage/pages/Users/ProtectedListPage')
);;

// Simple hook easier for testing
const useTrackUsage = () => {
  const { trackUsage } = useTracking();

  useEffect(() => {
    trackUsage('didAccessAuthenticatedAdministration');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

const Admin = () => {
  // Show a notification when the current version of Strapi is not the latest one
  const [menuCondensed, setMenuCondensed] = useState(true)
  const { isLoading, generalSectionLinks, pluginsSectionLinks } = useMenu();
  const { menu } = useStrapiApp();
  sessionStorage.setItem('pluginsSectionLinks', JSON.stringify(pluginsSectionLinks));
  sessionStorage.setItem('pluginsSectionLinks', JSON.stringify(pluginsSectionLinks));

  const routes = useMemo(() => {
    return menu
      .filter(link => link.Component)
      .map(({ to, Component, exact }) => createRoute(Component, to, exact));
  }, [menu]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <AppLayout
        menuCondensed={menuCondensed}
        sideNav={
          <LeftMenu
            generalSectionLinks={generalSectionLinks}
            pluginsSectionLinks={pluginsSectionLinks}
            setMenuCondensed={setMenuCondensed}
          />
        }
      >
        <Suspense fallback={<LoadingIndicatorPage />}>
          <Switch>
            <Route path="/" component={HomePage} exact />
            <Route path="/me" component={ProfilePage} exact />
            <Route path="/content-manager" component={CM} />
            {routes}
            <Route
              component={UserPage}
              key='/settings/users'
              path='/settings/users'
              exact
            />
            <Route path="/settings/:settingId" component={SettingsPage} />
            <Route path="/settings" component={SettingsPage} exact />
            <Route path="/marketplace">
              <MarketplacePage />
            </Route>
            <Route path="/list-plugins" exact>
              <InstalledPluginsPage />
            </Route>
            <Route path="/404" component={NotFoundPage} />
            <Route path="/500" component={InternalErrorPage} />
            <Route path="" component={NotFoundPage} />
          </Switch>
        </Suspense>
      </AppLayout>
    </DndProvider>
  );
};

export default Admin;
export { useTrackUsage };

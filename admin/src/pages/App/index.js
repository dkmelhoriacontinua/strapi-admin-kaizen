/**
 *
 * App.js
 *
 */

import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { Switch, Route } from 'react-router-dom';
import {
  LoadingIndicatorPage,
  auth,
  request,
  useNotification,
  TrackingContext,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { SkipToContent } from '@strapi/design-system/Main';

import AuthPage from '../AuthPage';
import NotFoundPage from '../NotFoundPage';
import PrivateRoute from '../../components/PrivateRoute';

import routes from './utils/routes';
import storage from '../../utils/storage';
import { createRoute, makeUniqueRoutes } from '../../utils';

const AuthenticatedApp = lazy(() =>
  import(/* webpackChunkName: "Admin-authenticatedApp" */ '../../components/AuthenticatedApp')
);

function App() {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const [{ isLoading, hasAdmin, uuid }, setState] = useState({ isLoading: true, hasAdmin: false });

  const authRoutes = useMemo(() => {
    return makeUniqueRoutes(
      routes.map(({ to, Component, exact }) => createRoute(Component, to, exact))
    );
  }, []);

  useEffect(() => {
    const currentToken = storage.getItem('jwtToken');

    const renewToken = async () => {
      try {
        const {
          data: { token },
        } = await request('/admin/renew-token', {
          method: 'POST',
          body: { token: currentToken },
        });

        storage.setItem('jwtToken', token);
      } catch (err) {
        // Refresh app
        auth.clearAppStorage();
        window.location.reload();
      }
    };

    if (currentToken) {
      renewToken();
    }
  }, []);

  useEffect(() => {
    const getData = async () => {
      try {
        const {
          data: { hasAdmin, uuid },
        } = await request('/admin/init', { method: 'GET' });

        setState({ isLoading: false, hasAdmin, uuid });
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: 'app.containers.App.notification.error.init' },
        });
      }
    };

    getData();
  }, [toggleNotification]);

  const setHasAdmin = hasAdmin => setState(prev => ({ ...prev, hasAdmin }));

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Suspense fallback={<LoadingIndicatorPage />}>
      <SkipToContent>{formatMessage({ id: 'skipToContent' })}</SkipToContent>
      <TrackingContext.Provider value={uuid}>
        <Switch>
          {authRoutes}
          <Route
            path="/auth/:authType"
            render={routerProps => (
              <AuthPage {...routerProps} setHasAdmin={setHasAdmin} hasAdmin={hasAdmin} />
            )}
            exact
          />
          <PrivateRoute path="/" component={AuthenticatedApp} />
          <Route path="" component={NotFoundPage} />
        </Switch>
      </TrackingContext.Provider>
    </Suspense>
  );
}

export default App;

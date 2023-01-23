import React, { useEffect, useState, useRef } from 'react';

import storage from '../../utils/storage';
import { backInstance } from '../../services/backendInstance';

import { NavLinkStyled } from './styled'

const IconBell = <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" aria-hidden="true" fontSize="5" className="sc-gsDKAQ sc-jrQzAO idGwtb inHzHV"><path d="M22 20H2v-2h1v-6.969C3 6.043 7.03 2 12 2s9 4.043 9 9.031V18h1v2zM9.5 21h5a2.5 2.5 0 01-5 0z" fill="#212134"></path></svg>;

const MenuLinkBadge = ({ info, onClick }) => {
  const [content, setContent] = useState(0);
  const interval = useRef(null);

  if (!info) { return <></>; }

  useEffect(() => {
    handleEventListener();
    (requestIndicatorCounter)();
    interval.current = setInterval(requestIndicatorCounter, 60000);
    return () => handleEventListener(true);
  }, []);

  function handleEventListener(isRemove = false) {
    const eventListenerType = document && (isRemove ? document.removeEventListener : document.addEventListener);
    eventListenerType('newNotification', requestIndicatorCounter);
    isRemove && clearInterval(interval.current);
  }

  async function requestIndicatorCounter() {
    try {
      const { id } = storage.getItem('userInfo') || {};
      const response = await backInstance.get('/notifications/open/total?userId=' + id);
      if (response.data) {
        setContent(response.data.totalNotifications);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <NavLinkStyled
      badgeContent={String(content)}
      to=''
      key={info.to}
      icon={IconBell}
      onClick={onClick}
      id="link-notification"
    >
      Notificações
    </NavLinkStyled>
  )
};

export default MenuLinkBadge;

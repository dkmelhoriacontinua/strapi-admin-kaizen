import React from 'react';

import PropTypes from 'prop-types';
import MagicLinkWrapper from './MagicLinkWrapper';
import basename from '../../../../../../core/utils/basename';

const MagicLink = ({ registrationToken }) => {
  const url = (CUSTOM_VARIABLES.NODE_ENV === 'production')
    ? 'https://kaizenlog.dailykaizenconsultoria.com.br'
    : 'https://kaizen-house-hml.enesolucoes.com.br';

  const target = `${url}${basename}auth/register?registrationToken=${registrationToken}`;

  return (
    <MagicLinkWrapper target={target}>
      Copie e compartilhe este link para dar acesso a este usuário
    </MagicLinkWrapper>
  );
};

MagicLink.defaultProps = {
  registrationToken: '',
};

MagicLink.propTypes = {
  registrationToken: PropTypes.string,
};

export default MagicLink;

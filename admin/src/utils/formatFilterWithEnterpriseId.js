function formatFilterWithEnterpriseId(enterpriseId, url = '', internalUrl = true) {  
  if (!url) return;

  const isFirstParameter = url.indexOf('?') === -1;
  const firstParameterFormat = isFirstParameter ? '?' : '&';

  if (!internalUrl) {
    return `${firstParameterFormat}enterpriseId=${enterpriseId}`;
  }
  
  const lastIndexFilter = url.lastIndexOf('filters');

  if (lastIndexFilter === -1) {
    return `${firstParameterFormat}filters[$and][0][id_empresa][$eq]=${enterpriseId}`;
  }

  const lastFilterDetails = url.substring(lastIndexFilter);
  const lastFilterInArray = lastFilterDetails.replace(/(\[)|(\])/g, '-').split('--');

  const position = Number(lastFilterInArray[1] || 0);

  if (isNaN(position)) return;

  return `&filters[$and][${position + 1}][id_empresa][$eq]=${enterpriseId}`;
}

export default formatFilterWithEnterpriseId;
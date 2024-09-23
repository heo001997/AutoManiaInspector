import {Button, Modal} from 'antd';
import { useEffect, useState } from 'react';

import ElementLocator from './ElementLocator.jsx';
import LocatedElements from './LocatedElements.jsx';

const LocatorTestModal = (props) => {
  const {
    isLocatorTestModalVisible,
    isSearchingForElements,
    clearSearchResults,
    locatedElements,
    t,
  } = props;

  const [isImageSearchResultVisible, setIsImageSearchResultVisible] = useState(false);

  useEffect(() => {
    const checkVisibility = () => {
      const element = document.getElementById('image-search-result');
      setIsImageSearchResultVisible(element && element.offsetParent !== null);
    };

    checkVisibility();
    window.addEventListener('resize', checkVisibility);
    return () => window.removeEventListener('resize', checkVisibility);
  }, []);

  const onCancel = () => {
    const {hideLocatorTestModal} = props;
    hideLocatorTestModal();
    clearSearchResults();
  };

  const onSubmit = () => {
    const {locatorTestStrategy, locatorTestValue, searchForElement} = props;
    if (locatedElements) {
      onCancel();
    } else {
      searchForElement(locatorTestStrategy, locatorTestValue);
    }
  };

  // Footer displays all the buttons at the bottom of the Modal
  return (
    <Modal
      open={isLocatorTestModalVisible}
      title={t('Search for element')}
      onCancel={onCancel}
      footer={
        isImageSearchResultVisible && (
          <>
            {locatedElements && (
              <Button onClick={(e) => e.preventDefault() || clearSearchResults()}>{t('Back')}</Button>
            )}
            <Button loading={isSearchingForElements} onClick={onSubmit} type="primary">
              {locatedElements ? t('Done') : t('Search')}
            </Button>
          </>
        )
      }
    >
      {!locatedElements && <ElementLocator {...props} />}
      {locatedElements && <LocatedElements {...props} />}
    </Modal>
  );
};

export default LocatorTestModal;

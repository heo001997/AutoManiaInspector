import React, { useState, useEffect, useCallback, useRef } from 'react';
import {Alert, Input, Radio, Row, Space, Upload, Button} from 'antd';
import {UploadOutlined, ScissorOutlined} from '@ant-design/icons';
import { message } from 'antd';
import { useSelector } from 'react-redux';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import {ALERT} from '../../constants/antd-types';
import {LOCATOR_STRATEGY_MAP as STRAT} from '../../constants/session-inspector';
import InspectorStyles from './Inspector.module.css';

const locatorStrategies = (automationName) => {
  let strategies = [
    STRAT.ID,
    STRAT.XPATH,
    STRAT.NAME,
    STRAT.CLASS_NAME,
    STRAT.ACCESSIBILITY_ID,
    ['image', 'Image'],
  ];
  switch (automationName) {
    case 'xcuitest':
    case 'mac2':
      strategies.push(STRAT.PREDICATE, STRAT.CLASS_CHAIN);
      break;
    case 'espresso':
      strategies.push(STRAT.DATAMATCHER, STRAT.VIEWTAG);
      break;
    case 'uiautomator2':
      strategies.push(STRAT.UIAUTOMATOR);
      break;
  }
  return strategies;
};

const ElementLocator = (props) => {
  const {
    setLocatorTestValue,
    locatorTestValue,
    setLocatorTestStrategy,
    locatorTestStrategy,
    automationName,
    t,
  } = props;

  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [crop, setCrop] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef(null);
  
  // Get the driver from the Redux state
  const driver = useSelector(state => state.inspector.driver);

  const takeScreenshot = async () => {
    try {
      const screenshot = await driver.takeScreenshot();
      setScreenshotPreview(`data:image/png;base64,${screenshot}`);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  };

  useEffect(() => {
    if (locatorTestStrategy === 'image') {
      takeScreenshot();
    }
  }, [locatorTestStrategy]);

  const handleImageUpload = async (info) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1];
      setLocatorTestValue(base64);
      setSelectedImagePreview(e.target.result);
    };
    reader.readAsDataURL(info.file.originFileObj);
  };

  const startCropping = () => {
    setIsCropping(true);
    // Set initial crop to null to allow free-form selection
    setCrop(null);
  };

  const getCroppedImg = useCallback((image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / imageDimensions.width;
    const scaleY = image.naturalHeight / imageDimensions.height;
    
    const pixelCrop = {
      x: Math.round(crop.x * scaleX),
      y: Math.round(crop.y * scaleY),
      width: Math.round(crop.width * scaleX),
      height: Math.round(crop.height * scaleY)
    };

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result);
        };
      }, 'image/png');
    });
  }, [imageDimensions]);

  const completeCrop = useCallback(async () => {
    if (crop && screenshotPreview && imageRef.current) {
      const image = imageRef.current;
      const croppedImageDataUrl = await getCroppedImg(image, crop);
      const base64 = croppedImageDataUrl.split(',')[1];
      setLocatorTestValue(base64);
      setSelectedImagePreview(croppedImageDataUrl);
      setIsCropping(false);
      setCrop(null);
    }
  }, [crop, screenshotPreview, getCroppedImg, setLocatorTestValue]);

  const onImageLoad = useCallback((e) => {
    setImageDimensions({ width: e.currentTarget.width, height: e.currentTarget.height });
  }, []);

  const [imageSearchResult, setImageSearchResult] = useState(null);

  const findImageInScreenshot = async () => {
    try {
      const options = {threshold: 0.7, visualize: true};
      const screenshotBase64 = screenshotPreview.split(',')[1];
      const result = await driver.compareImages('matchTemplate', screenshotBase64, locatorTestValue, options);
      setImageSearchResult(result ? result : false);
    } catch (error) {
      console.error('Failed to find image in screenshot:', error);
      setImageSearchResult(false);
    }
  };

  console.log('Rendering. isCropping:', isCropping, 'screenshotPreview:', !!screenshotPreview);

  return (
    <Space className={InspectorStyles.spaceContainer} direction="vertical" size="small">
      {t('locatorStrategy')}
      <Row justify="center">
        <Radio.Group
          buttonStyle="solid"
          onChange={(e) => setLocatorTestStrategy(e.target.value)}
          defaultValue={locatorTestStrategy}
        >
          <Row justify="center">
            {locatorStrategies(automationName).map(([strategyValue, strategyName]) => (
              <Radio.Button
                className={InspectorStyles.locatorStrategyBtn}
                value={strategyValue}
                key={strategyValue}
              >
                {strategyName}
              </Radio.Button>
            ))}
          </Row>
        </Radio.Group>
      </Row>
      {!automationName && (
        <Alert message={t('missingAutomationNameForStrategies')} type={ALERT.INFO} showIcon />
      )}
      {locatorTestStrategy === 'image' && screenshotPreview && (
        <div className={InspectorStyles.screenshotContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {t('Current Screenshot')}
            <Button 
              icon={<ScissorOutlined />} 
              onClick={isCropping ? completeCrop : startCropping}
            >
              {isCropping ? t('Crop') : t('Start Cropping')}
            </Button>
          </div>
          {isCropping ? (
            <ReactCrop
              src={screenshotPreview}
              crop={crop}
              onChange={newCrop => setCrop(newCrop)}
              onComplete={(c) => setCrop(c)}
            >
              <img 
                ref={imageRef}
                src={screenshotPreview} 
                alt="Current screenshot for cropping" 
                onLoad={onImageLoad}
              />
            </ReactCrop>
          ) : (
            <img 
              ref={imageRef}
              src={screenshotPreview} 
              alt="Current screenshot" 
              className={InspectorStyles.screenshotImage}
              onLoad={onImageLoad}
            />
          )}
        </div>
      )}
      {t('selector')}
      {locatorTestStrategy === 'image' ? (
        <>
          <Upload
            accept="image/*"
            beforeUpload={(file) => {
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                message.error('You can only upload image files!');
              }
              return isImage;
            }}
            onChange={handleImageUpload}
          >
            <Button icon={<UploadOutlined />}>Upload Image</Button>
          </Upload>
          {selectedImagePreview && (
            <div className={InspectorStyles.selectedImagePreview}>
              <div>{t('Selected Image')}</div>
              <img 
                src={selectedImagePreview} 
                alt="Selected image" 
                style={{ maxWidth: '100%' }} 
              />
              <div> 
                <Button 
                  onClick={findImageInScreenshot}
                  style={{ marginTop: '10px' }}
                >
                {t('Find in Screenshot')}
              </Button>
              </div>
              {imageSearchResult !== null && (
                <div id="image-search-result" className={InspectorStyles.screenshotContainer} style={{ marginTop: '10px' }}>
                  {imageSearchResult 
                    ? (
                      <>
                        {t('Image found in screenshot')}
                        {imageSearchResult.visualization && (
                          <img 
                            src={`data:image/png;base64,${imageSearchResult.visualization}`} 
                            alt="Visualization of found image" 
                            className={InspectorStyles.screenshotImage}
                            style={{ maxWidth: '100%', marginTop: '10px' }} 
                          />
                        )}
                      </>
                    ) 
                    : t('Image not found in screenshot')}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <Input.TextArea
          className={InspectorStyles.locatorSelectorTextArea}
          onChange={(e) => setLocatorTestValue(e.target.value)}
          value={locatorTestValue}
          allowClear={true}
          rows={3}
        />
      )}
    </Space>
  );
};

export default ElementLocator;

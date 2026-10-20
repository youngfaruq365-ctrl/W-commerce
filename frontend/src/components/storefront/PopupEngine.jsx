import React, { useEffect, useState } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import TemplateRenderer from './TemplateRenderer';

const PopupEngine = ({ storeId }) => {
  const [activeTemplates, setActiveTemplates] = useState([]);

  useEffect(() => {
    if (!storeId) return;

    const fetchActiveTemplates = async () => {
      try {
        const res = await axios.get(`/api/v1/stores/${storeId}/active-templates`);
        const data = res.data;
        
        if (data.success) {
          setActiveTemplates(data.templates);
        }
      } catch (err) {
      }
    };

    fetchActiveTemplates();
  }, [storeId]);

  if (!activeTemplates || activeTemplates.length === 0) return null;

  return (
    <>
      {activeTemplates.map(st => {
        // Parse the DNA
        const dna = (() => {
          try {
            if (st.customizedConfiguration) {
              return typeof st.customizedConfiguration === 'string'
                ? JSON.parse(st.customizedConfiguration)
                : st.customizedConfiguration;
            }
            return typeof st.template?.configuration === 'string'
              ? JSON.parse(st.template.configuration)
              : st.template?.configuration || {};
          } catch(e) { return {}; }
        })();
        
        return (
          <TemplateRenderer 
            key={st.id} 
            templateDNA={dna} 
            isPreview={false}
          />
        );
      })}
    </>
  );
};

export default PopupEngine;

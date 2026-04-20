import React from 'react';
import { CreateNoticeForm } from './CreateNoticeForm';

export const CreateWarningNotice = ({ onBack, postToEdit }: { onBack: () => void; postToEdit?: any }) => (
  <CreateNoticeForm postSubtype="warning" onBack={onBack} postToEdit={postToEdit} />
);

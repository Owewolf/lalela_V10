import React from 'react';
import { CreateNoticeForm } from './CreateNoticeForm';

export const CreateInfoNotice = ({ onBack, postToEdit }: { onBack: () => void; postToEdit?: any }) => (
  <CreateNoticeForm postSubtype="information" onBack={onBack} postToEdit={postToEdit} />
);

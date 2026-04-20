import React from 'react';
import { CreateNoticeForm } from './CreateNoticeForm';

export const CreateGeneralNotice = ({ onBack, postToEdit }: { onBack: () => void; postToEdit?: any }) => (
  <CreateNoticeForm postSubtype="normal" onBack={onBack} postToEdit={postToEdit} />
);

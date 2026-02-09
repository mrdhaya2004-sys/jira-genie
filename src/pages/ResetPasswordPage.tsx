import React from 'react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { Helmet } from 'react-helmet-async';

const ResetPasswordPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Reset Password - Test Zone</title>
        <meta name="description" content="Create a new password for your Test Zone account." />
      </Helmet>
      <ResetPasswordForm />
    </>
  );
};

export default ResetPasswordPage;

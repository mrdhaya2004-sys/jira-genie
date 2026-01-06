import React from 'react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { Helmet } from 'react-helmet-async';

const ResetPasswordPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Reset Password - Testzone</title>
        <meta name="description" content="Create a new password for your Testzone account." />
      </Helmet>
      <ResetPasswordForm />
    </>
  );
};

export default ResetPasswordPage;

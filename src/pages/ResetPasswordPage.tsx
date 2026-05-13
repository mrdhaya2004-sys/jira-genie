import React from 'react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { Helmet } from 'react-helmet-async';

const ResetPasswordPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Reset Password — Test Zone</title>
        <meta name="description" content="Create a new password for your Test Zone account." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://www.testzoneai.com/auth/reset-password" />
        <meta property="og:title" content="Reset Password — Test Zone" />
        <meta property="og:description" content="Create a new password for your Test Zone account." />
        <meta property="og:url" content="https://www.testzoneai.com/auth/reset-password" />
      </Helmet>
      <ResetPasswordForm />
    </>
  );
};

export default ResetPasswordPage;

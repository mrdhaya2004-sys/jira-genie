import React from 'react';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { Helmet } from 'react-helmet-async';

const ForgotPasswordPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Forgot Password — Test Zone</title>
        <meta name="description" content="Reset your Test Zone password. Enter your email to receive a password reset link." />
        <link rel="canonical" href="https://www.testzoneai.com/auth/forgot-password" />
        <meta property="og:title" content="Forgot Password — Test Zone" />
        <meta property="og:description" content="Reset your Test Zone password. Enter your email to receive a password reset link." />
        <meta property="og:url" content="https://www.testzoneai.com/auth/forgot-password" />
      </Helmet>
      <ForgotPasswordForm />
    </>
  );
};

export default ForgotPasswordPage;

import React from 'react';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { Helmet } from 'react-helmet-async';

const ForgotPasswordPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Forgot Password - Testzone</title>
        <meta name="description" content="Reset your Testzone password. Enter your email to receive a password reset link." />
      </Helmet>
      <ForgotPasswordForm />
    </>
  );
};

export default ForgotPasswordPage;

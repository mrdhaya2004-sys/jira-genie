import React from 'react';
import LoginForm from '@/components/auth/LoginForm';
import { Helmet } from 'react-helmet-async';

const LoginPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Sign In - Testzone</title>
        <meta name="description" content="Sign in to Testzone, your AI-powered Jira ticket creation assistant for IT Cloud teams." />
      </Helmet>
      <LoginForm />
    </>
  );
};

export default LoginPage;

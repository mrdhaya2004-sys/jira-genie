import React from 'react';
import SignupForm from '@/components/auth/SignupForm';
import { Helmet } from 'react-helmet-async';

const SignupPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Sign Up - Testzone</title>
        <meta name="description" content="Create your Testzone account to streamline IT ticket creation with AI-powered assistance." />
      </Helmet>
      <SignupForm />
    </>
  );
};

export default SignupPage;

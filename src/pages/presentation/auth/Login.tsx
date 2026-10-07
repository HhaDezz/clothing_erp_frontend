import React, { FC, FormEvent, useContext, useState } from 'react';
import { useFormik } from 'formik';
import { useNavigate } from 'react-router-dom';
import Alert from '../../../components/bootstrap/Alert';
import Spinner from '../../../components/bootstrap/Spinner';
import Icon from '../../../components/icon/Icon';
import AuthContext from '../../../contexts/authContext';
import useDarkMode from '../../../hooks/useDarkMode';
import { useLogin } from '../../../hooks/useLogin';
import Page from '../../../layout/Page/Page';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import bgImage from '../../../assets/img/clothing-erp-login-hero.png';

interface ILoginProps {
	isSignUp?: boolean;
}

interface ILoginError {
	response?: {
		data?: {
			message?: string;
		};
	};
}

const REMEMBERED_EMAIL_KEY = 'rememberedLoginEmail';

const Login: FC<ILoginProps> = () => {
	const { setUser } = useContext(AuthContext);
	const { darkModeStatus } = useDarkMode();
	const navigate = useNavigate();
	const { mutate: login, isPending, isError, error } = useLogin();
	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(() =>
		Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY)),
	);

	const formik = useFormik({
		initialValues: {
			loginUsername: localStorage.getItem(REMEMBERED_EMAIL_KEY) || '',
			loginPassword: '',
		},
		validate: (values) => {
			const errors: { loginUsername?: string; loginPassword?: string } = {};
			const email = values.loginUsername.trim();

			if (!email) {
				errors.loginUsername = 'Email address is required.';
			} else if (!/^\S+@\S+\.\S+$/.test(email)) {
				errors.loginUsername = 'Enter a valid email address.';
			}

			if (!values.loginPassword) {
				errors.loginPassword = 'Password is required.';
			}

			return errors;
		},
		onSubmit: (values) => {
			const email = values.loginUsername.trim();

			login(
				{
					email,
					password: values.loginPassword,
				},
				{
					onSuccess: (response) => {
						localStorage.setItem('token', response.data.token);
						localStorage.setItem('user', JSON.stringify(response.data));

						if (rememberMe) {
							localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
						} else {
							localStorage.removeItem(REMEMBERED_EMAIL_KEY);
						}

						if (setUser) setUser(response.data.username || email);
						navigate('/');
					},
					onError: () => {
						formik.setFieldError(
							'loginPassword',
							'The email or password is incorrect.',
						);
					},
				},
			);
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		formik.handleSubmit();
	};

	const apiError = (error as ILoginError | null)?.response?.data?.message;

	return (
		<PageWrapper
			isProtected={false}
			title='Login'
			className={`login-page-wrapper p-0 ${darkModeStatus ? 'login-page-dark' : ''}`}>
			<Page className='login-page p-0' container={false}>
				<main className='login-shell'>
					<section
						className='login-story'
						style={{ backgroundImage: `url(${bgImage})` }}
						aria-label='Clothing ERP overview'>
						<div className='login-story-overlay' />
						<div className='login-story-content'>
							<div className='login-brand login-brand-light'>
								<img
									className='login-brand-logo'
									src='https://talnaholdings.com/wp-content/uploads/2025/01/Talna-logo-color-guide-02.png'
									alt='Talna'
									decoding='async'
								/>
								<span className='login-brand-subtitle'>Clothing ERP System</span>
							</div>

							<div className='login-story-copy'>
								<span className='login-eyebrow'>clothing workspace</span>
								<h1>
									Create. Make.
									<br />
									Grow together.
								</h1>
								<p>
									Manage materials, designs, production, inventory, and orders
									from one connected workspace.
								</p>
							</div>

							<div className='login-floating-card login-floating-card-production'>
								<span className='login-floating-icon'>
									<Icon icon='ContentCut' />
								</span>
								<span>
									<small>Production</small>
									<strong>Everything in sync</strong>
								</span>
							</div>

							<div className='login-floating-card login-floating-card-stock'>
								<span className='login-floating-icon'>
									<Icon icon='Checkroom' />
								</span>
								<span>
									<small>Garment flow</small>
									<strong>Moving right along</strong>
								</span>
							</div>

							<div className='login-trust-row'>
								<div>
									<Icon icon='ContentCut' aria-hidden='true' />
									<span className='login-trust-copy'>
										<strong>Easy production tracking</strong>
										<small>Know what is happening at a glance</small>
									</span>
								</div>
								<div>
									<Icon icon='Checkroom' aria-hidden='true' />
									<span className='login-trust-copy'>
										<strong>One connected team</strong>
										<small>From design room to finished stock</small>
									</span>
								</div>
							</div>
						</div>
					</section>

					<section className='login-panel'>
						<div className='login-form-wrap' data-tour='login-page'>
							<div className='login-brand login-brand-mobile'>
								<img
									className='login-brand-logo'
									src='https://talnaholdings.com/wp-content/uploads/2025/01/Talna-logo-color-guide-02.png'
									alt='Talna'
									decoding='async'
								/>
								<span className='login-brand-subtitle'>Clothing ERP System</span>
							</div>

							<header className='login-heading'>
								{/* <span className='login-welcome-icon' aria-hidden='true'>
									👋
								</span> */}
								{/* <span className='login-eyebrow'>Nice to see you</span> */}
								<h2>Welcome back!</h2>
								<p>Sign in and pick up right where your team left off.</p>
							</header>

							{isError && (
								<Alert color='danger' isLight icon='Cancel' className='login-alert'>
									{apiError ||
										'We could not sign you in. Check your details and try again.'}
								</Alert>
							)}

							<form className='login-form' onSubmit={handleSubmit} noValidate>
								<div className='login-field'>
									<label htmlFor='loginUsername'>Work email</label>
									<div
										className={`login-input ${formik.touched.loginUsername && formik.errors.loginUsername ? 'is-invalid' : ''}`}>
										<Icon icon='MailOutline' aria-hidden='true' />
										<input
											id='loginUsername'
											name='loginUsername'
											type='email'
											autoComplete='email'
											placeholder='name@company.com'
											value={formik.values.loginUsername}
											onChange={formik.handleChange}
											onBlur={formik.handleBlur}
											aria-invalid={Boolean(
												formik.touched.loginUsername &&
												formik.errors.loginUsername,
											)}
											aria-describedby='loginUsername-error'
											autoFocus
										/>
									</div>
									{formik.touched.loginUsername &&
										formik.errors.loginUsername && (
											<span
												id='loginUsername-error'
												className='login-field-error'>
												{formik.errors.loginUsername}
											</span>
										)}
								</div>

								<div className='login-field'>
									<label htmlFor='loginPassword'>Password</label>
									<div
										className={`login-input ${formik.touched.loginPassword && formik.errors.loginPassword ? 'is-invalid' : ''}`}>
										<Icon icon='Lock' aria-hidden='true' />
										<input
											id='loginPassword'
											name='loginPassword'
											type={showPassword ? 'text' : 'password'}
											autoComplete='current-password'
											placeholder='Enter your password'
											value={formik.values.loginPassword}
											onChange={formik.handleChange}
											onBlur={formik.handleBlur}
											aria-invalid={Boolean(
												formik.touched.loginPassword &&
												formik.errors.loginPassword,
											)}
											aria-describedby='loginPassword-error'
										/>
										<button
											type='button'
											className='login-password-toggle'
											onClick={() => setShowPassword((visible) => !visible)}
											aria-label={
												showPassword ? 'Hide password' : 'Show password'
											}>
											<Icon
												icon={showPassword ? 'VisibilityOff' : 'Visibility'}
												aria-hidden='true'
											/>
										</button>
									</div>
									{formik.touched.loginPassword &&
										formik.errors.loginPassword && (
											<span
												id='loginPassword-error'
												className='login-field-error'>
												{formik.errors.loginPassword}
											</span>
										)}
								</div>

								<div className='login-form-options'>
									<label className='login-remember' htmlFor='rememberMe'>
										<input
											id='rememberMe'
											type='checkbox'
											checked={rememberMe}
											onChange={(event) =>
												setRememberMe(event.target.checked)
											}
										/>
										<span>Remember my email</span>
									</label>
									<span className='login-help'>
										Need a hand? Ask your administrator
									</span>
								</div>

								<button type='submit' className='login-submit' disabled={isPending}>
									{isPending ? (
										<>
											<Spinner isSmall inButton isGrow /> Signing in...
										</>
									) : (
										<>
											Let&apos;s get to work
											<Icon
												icon='ArrowForward'
												className='login-submit-icon'
												aria-hidden='true'
											/>
										</>
									)}
								</button>
							</form>

							<footer className='login-footer'>
								<Icon icon='Lock' aria-hidden='true' />
								<span>Authorised personnel only</span>
								<span aria-hidden='true'>•</span>
								<span>© {new Date().getFullYear()} Talna</span>
							</footer>
						</div>
					</section>
				</main>
			</Page>
		</PageWrapper>
	);
};

export default Login;

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

type SweetAlertIcon = 'success' | 'error' | 'warning' | 'info' | 'question';

const showNotification = (
	title: string | JSX.Element,
	message: string | JSX.Element,
	type = 'default',
) => {
	let icon: SweetAlertIcon | undefined;
	let iconColor = '#2563eb'; // Default brand primary

	if (type === 'danger') {
		icon = 'error';
		iconColor = '#dc3545';
	} else if (type === 'success') {
		icon = 'success';
		iconColor = '#60a5fa'; // Brand secondary blue
	} else if (type === 'warning') {
		icon = 'warning';
		iconColor = '#ffc107';
	} else if (type === 'info') {
		icon = 'info';
		iconColor = '#17a2b8';
	}

	MySwal.fire({
		title: title as any,
		html: message as any,
		icon,
		iconColor,
		background: '#f8faff', // Very subtle blue tint background
		color: '#172554', // Dark blue text
		showConfirmButton: true,
		timer: 2500,
		timerProgressBar: true,
		showCloseButton: false,
		toast: true,
		position: 'center',
		customClass: {
			popup: 'animate__animated animate__bounceInRight animate__fast border border-2 shadow-lg rounded-4',
			title: 'fs-6 fw-bolder mb-1',
			htmlContainer: 'fs-7',
		},
		hideClass: {
			popup: 'animate__animated animate__zoomOut animate__faster',
		},
		didOpen: (toast) => {
			toast.addEventListener('mouseenter', Swal.stopTimer);
			toast.addEventListener('mouseleave', Swal.resumeTimer);

			// Match progress bar to the brand blue
			const progressBar = toast.querySelector('.swal2-timer-progress-bar') as HTMLElement;
			if (progressBar) {
				progressBar.style.backgroundColor = '#60a5fa';
			}

			// Dynamic border coloring based on type
			if (type === 'danger') toast.classList.add('border-danger');
			else if (type === 'warning') toast.classList.add('border-warning');
			else if (type === 'info') toast.classList.add('border-info');
			else toast.classList.add('border-primary'); // Default & Success use primary brand color
		},
	});
};

export default showNotification;

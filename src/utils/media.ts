const ABSOLUTE_URL_PATTERN = /^(?:https?:|data:|blob:)/i;

const uniqueUrls = (urls: Array<string | null | undefined>) =>
	Array.from(new Set(urls.filter((url): url is string => Boolean(url))));

export const resolveMediaUrls = (path?: string | null) => {
	if (!path) return [];

	const normalizedPath = path.trim().replace(/\\/g, '/');
	if (!normalizedPath) return [];
	if (ABSOLUTE_URL_PATTERN.test(normalizedPath)) return [normalizedPath];

	const trimmedPath = normalizedPath.replace(/^\/+/, '');
	const fileName = trimmedPath.split('/').pop();

	if (trimmedPath.startsWith('storage/app/public/')) {
		const relativePath = trimmedPath.replace('storage/app/public/', '');
		return uniqueUrls([
			`/storage/${relativePath}`,
			`/${relativePath}`,
			fileName ? `/storage/profile_photo/${fileName}` : null,
			`/${trimmedPath}`,
		]);
	}

	if (trimmedPath.includes('/storage/app/public/')) {
		const relativePath = trimmedPath.split('/storage/app/public/').pop();
		return uniqueUrls([
			relativePath ? `/storage/${relativePath}` : null,
			relativePath ? `/${relativePath}` : null,
			fileName ? `/storage/profile_photo/${fileName}` : null,
			`/${trimmedPath}`,
		]);
	}

	if (trimmedPath.startsWith('storage/profile_photo/')) {
		return uniqueUrls([
			`/${trimmedPath}`,
			fileName ? `/profile_photo/${fileName}` : null,
		]);
	}

	if (trimmedPath.startsWith('public/')) {
		const relativePath = trimmedPath.replace('public/', '');
		return uniqueUrls([
			`/storage/${relativePath}`,
			`/${relativePath}`,
		]);
	}

	if (trimmedPath.startsWith('storage/')) {
		return uniqueUrls([
			`/${trimmedPath}`,
			fileName ? `/storage/profile_photo/${fileName}` : null,
		]);
	}

	if (trimmedPath.startsWith('profile_photo/')) {
		return uniqueUrls([
			`/storage/${trimmedPath}`,
			`/${trimmedPath}`,
		]);
	}

	return uniqueUrls([
		`/${trimmedPath}`,
		fileName ? `/storage/profile_photo/${fileName}` : null,
	]);
};

export const resolveMediaUrl = (path?: string | null) => resolveMediaUrls(path)[0] || null;

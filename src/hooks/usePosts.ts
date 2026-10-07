import { useQuery } from '@tanstack/react-query';

type Post = {
	id: number;
	title: string;
	body: string;
};

const fetchPosts = async (): Promise<Post[]> => {
	const res = await fetch('https://jsonplaceholder.typicode.com/posts');
	if (!res.ok) throw new Error('Failed to fetch posts');
	return res.json();
};

export const usePosts = () =>
	useQuery({
		queryKey: ['posts'],
		queryFn: fetchPosts,
	});

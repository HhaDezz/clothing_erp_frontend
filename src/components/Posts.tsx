import { usePosts } from '../hooks/usePosts';

export const Posts = () => {
	const { data, isLoading, isError, error } = usePosts();

	if (isLoading) return <p>Loading...</p>;
	if (isError) return <p>Error: {error.message}</p>;

	return (
		<ul>
			{data?.map((post) => (
				<li key={post.id}>{post.title}</li>
			))}
		</ul>
	);
};

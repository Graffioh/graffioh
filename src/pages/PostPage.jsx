import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ContentViewer from '../ContentViewer';

const PostPage = () => {
  const { id } = useParams();
  const [content, setContent] = useState(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const md = await import(`../../mds/blog/${id}.md?raw`);
        setContent(md.default);
      } catch (error) {
        setContent('# Post not found');
      }
    };

    loadContent();
  }, [id]);

  return (
    <div>
      {content ? <ContentViewer content={content} /> : <p>Loading...</p>}
    </div>
  );
};

export default PostPage;

import React from 'react';

const Avatar = ({ children }) => <div>{children}</div>;
const AvatarImage = ({ src, alt }) => <img src={src} alt={alt} />;
const AvatarFallback = ({ children }) => <span>{children}</span>;

export { Avatar, AvatarImage, AvatarFallback };

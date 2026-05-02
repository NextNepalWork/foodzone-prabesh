import React, { useState, useEffect } from 'react';

const LazyImage = ({ src, alt, className, placeholder = '/images/placeholder-food.jpg' }) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, setImageRef] = useState();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    let observer;
    
    if (imageRef && imageSrc === placeholder) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setIsInView(true);
              observer.unobserve(imageRef);
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(imageRef);
    }
    
    return () => {
      if (observer && observer.unobserve) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, imageSrc, placeholder]);

  useEffect(() => {
    if (isInView && imageSrc === placeholder) {
      const imageLoader = new Image();
      imageLoader.src = src;
      imageLoader.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      imageLoader.onerror = () => {
        setIsLoaded(true); // Keep placeholder on error
      };
    }
  }, [isInView, src, imageSrc, placeholder]);

  return (
    <img
      ref={setImageRef}
      src={imageSrc}
      alt={alt}
      className={`${className} transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-70'
      }`}
      loading="lazy"
    />
  );
};

export default LazyImage;

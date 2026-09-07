export function ProjectCard({ project }) {
  return (
    <div className="col-12 col-md-6 col-lg-4 mb-4">
      <div className={`card text-center h-100 ${project.cardClass || ''}`}>
        <img
          src={project.image}
          className="card-img-top border-bottom"
          alt={project.alt}
          loading="lazy"
        />
        <div className="card-body mb-5 pl-0">
          <h3>{project.title}</h3>
          <p className="card-text">{project.description}</p>
          <p className="card-text">
            <small>{project.features}</small>
          </p>
          <div className="gitLinks w-100 py-3 pt-3 pl-0 position-absolute">
            <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="btn mr-2">
              <i className="fas fa-laptop-code" aria-hidden="true"></i> Demo
            </a>
            <a href={project.codeUrl} target="_blank" rel="noopener noreferrer" className="btn">
              <i className="fab fa-github" aria-hidden="true"></i> GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

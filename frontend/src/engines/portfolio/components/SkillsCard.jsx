import { SKILL_ICONS } from '../data/constants';

export function SkillsCard() {
  return (
    <section id="skills" className="container skills">
      <div className="skillsCard">
        <h2>
          <i className="fas fa-code" aria-hidden="true"></i>
        </h2>
        <h3>Technical Skills</h3>
        <p>
          HTML5, CSS3, ES6, JavaScript, jQuery, Bootstrap, Bulma, React.js, Node.js, AJAX, MySQL, NoSQL,
          Express, HandlebarsJS, Git, GitHub, npm, Postman, AWS
        </p>
        <p id="skillsIcon">
          {SKILL_ICONS.map((icon) => (
            <i key={icon} className={icon} aria-hidden="true"></i>
          ))}
        </p>
      </div>
    </section>
  );
}

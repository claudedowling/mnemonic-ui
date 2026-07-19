import { colorForProject } from '../lib/projectColor'

export interface ProjectOption {
  value: string
  label: string
}

interface Props {
  projects: ProjectOption[]
  activeProject: string | null
  onSelect: (project: string | null) => void
}

export function ProjectFilter({ projects, activeProject, onSelect }: Props) {
  if (projects.length <= 1) return null

  return (
    <div className="project-filter">
      {projects.map((p) => (
        <button
          key={p.value}
          type="button"
          className={p.value === activeProject ? 'project-filter-pill active' : 'project-filter-pill'}
          onClick={() => onSelect(p.value === activeProject ? null : p.value)}
        >
          <span className="project-filter-dot" style={{ backgroundColor: colorForProject(p.value) }} />
          {p.label}
        </button>
      ))}
    </div>
  )
}

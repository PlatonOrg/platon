import {
  CircleTree,
  ResourceFilters,
  ResourceOrderings,
  ResourceStatus,
  ResourceTypes,
} from '@platon/feature/resource/common'
import { FilterIndicator } from '@platon/shared/ui'
import { RESOURCE_ORDERING_NAMES, RESOURCE_STATUS_NAMES, RESOURCE_TYPE_NAMES } from '../../pipes'
import { Topic } from '@platon/core/common'

export const CircleFilterIndicator = (circle: CircleTree): FilterIndicator<ResourceFilters> => {
  return {
    match: (filters) => !!filters.parents?.includes(circle.id),
    remove: (filters) => ({ ...filters, parents: filters.parents?.filter((e) => e !== circle.id) }),
    describe: () => `Appartient à "${circle.name}"`,
  }
}

export const ResourceTypeFilterIndicator = (type: ResourceTypes): FilterIndicator<ResourceFilters> => {
  return {
    match: (filters) => !!filters.types?.includes(type),
    remove: (filters) => ({
      ...filters,
      types: filters.types?.filter((e) => e !== type),
      ...(type === ResourceTypes.EXERCISE ? { configurable: undefined } : {}),
    }),
    describe: () => RESOURCE_TYPE_NAMES[type],
  }
}

export const ResourceStatusFilterIndicator = (status: ResourceStatus): FilterIndicator<ResourceFilters> => {
  return {
    match: (filters) => !!filters.status?.includes(status),
    remove: (filters: ResourceFilters) => ({
      ...filters,
      status: filters.status?.filter((e) => e !== status),
    }),
    describe: () => RESOURCE_STATUS_NAMES[status],
  }
}

export const ResourceOrderingFilterIndicator = (ordering: ResourceOrderings): FilterIndicator<ResourceFilters> => {
  return {
    match: (filters) => filters.order === ordering,
    remove: (filters: ResourceFilters) => ({
      ...filters,
      order: undefined,
    }),
    describe: () => 'Trier par ' + RESOURCE_ORDERING_NAMES[ordering],
  }
}

export const ExerciseConfigurableFilterIndicator: FilterIndicator<ResourceFilters> = {
  match: (filters) => !!filters.configurable,
  remove: (filters: ResourceFilters) => ({
    ...filters,
    configurable: undefined,
  }),
  describe: () => 'Exercice configurable',
}

export const TopicFilterIndicator = (topic: Topic): FilterIndicator<ResourceFilters> => {
  return {
    match: (filters) => !!filters.topics?.includes(topic.id),
    remove: (filters: ResourceFilters) => ({
      ...filters,
      topics: filters.topics?.filter((e) => e !== topic.id),
    }),
    describe: () => `Possède le topic "${topic.name}"`,
  }
}

export const LevelFilterIndicator = (level: Topic): FilterIndicator<ResourceFilters> => {
  return {
    match: (filters) => !!filters.levels?.includes(level.id),
    remove: (filters: ResourceFilters) => ({
      ...filters,
      levels: filters.levels?.filter((e) => e !== level.id),
    }),
    describe: () => `Possède le niveau "${level.name}"`,
  }
}

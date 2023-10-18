export type BaseIndex = {
  objectID: string
  title: string
  url: string

  section?: string

  /**
   * The anchor id
   */
  section_id?: string

  /**
   * The id of page, used for distinct
   */
  page_id: string

  content: string
}

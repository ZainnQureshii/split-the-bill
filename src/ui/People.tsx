import { useState } from 'react'
import { Avatar } from './Avatar'
import { AnimatedRow } from './AnimatedRow'
import type { UseBill } from '../state'

type PeopleProps = Pick<UseBill, 'bill' | 'billVersion' | 'nameOf' | 'actions'> & {
  empty: boolean
}

export function People({ bill, billVersion, nameOf, actions, empty }: PeopleProps) {
  const [newName, setNewName] = useState('')

  return (
    <section aria-labelledby="people-title">
      <div className="section-heading">
        <h2 id="people-title">Who’s at the table?</h2>
        {!empty && <span>{bill.people.length} {bill.people.length === 1 ? 'person' : 'people'}</span>}
      </div>
      <ul className="people-list" key={billVersion}>
        {bill.people.map((person, i) => (
          <AnimatedRow
            key={person.id}
            onRemove={() => actions.removePerson(person.id)}
            focusTarget="new-person"
          >
            {remove => (
              <div className="person-row">
                <Avatar personId={person.id} />
                <label>
                  <span className="sr-only">Person {i + 1} name</span>
                  <input
                    value={person.name}
                    placeholder="Enter a name"
                    onChange={e => actions.renamePerson(person.id, e.target.value)}
                  />
                </label>
                <button
                  className="remove"
                  aria-label={`Remove ${nameOf(person.id)}`}
                  onClick={remove}
                >
                  ×
                </button>
              </div>
            )}
          </AnimatedRow>
        ))}
      </ul>
      <form
        className="add-person"
        onSubmit={e => {
          e.preventDefault()
          if (newName.trim() === '') return
          actions.addPerson(newName.trim())
          setNewName('')
          document.getElementById('new-person')?.focus()
        }}
      >
        <label htmlFor="new-person">
          Add someone
          <input
            id="new-person"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Their name"
          />
        </label>
        <button className="primary" type="submit">Add person</button>
      </form>
    </section>
  )
}

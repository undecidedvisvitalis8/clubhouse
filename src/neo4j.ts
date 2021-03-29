import * as neo4j from 'neo4j-driver'

import { SocialGraphUserProfile } from './types'
import { sanitize } from './utils'

export type TransactionOrSession = neo4j.Transaction | neo4j.Session

export const driver = (
  neo4jURI = process.env.NEO4J_URI,
  neo4jUser = process.env.NEO4J_USER,
  neo4jPassword = process.env.NEO4J_PASSWORD,
  neo4jEncryptedConnection = process.env.NEO4J_ENCRYPTED
) => {
  const isEncrypted =
    !!neo4jEncryptedConnection && neo4jEncryptedConnection !== 'false'

  return neo4j.driver(neo4jURI, neo4j.auth.basic(neo4jUser, neo4jPassword), {
    disableLosslessIntegers: true,
    encrypted: isEncrypted ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF'
  })
}

export const upsertUser = (
  tx: TransactionOrSession,
  user: SocialGraphUserProfile
) => {
  return tx.run(
    `
      MERGE (user:User { user_id: toInteger($user_id) })
        ON CREATE SET user.name = $name,
          user.photo_url = $photo_url,
          user.username = $username,
          user.twitter = $twitter,
          user.bio = $bio,
          user.displayname = $displayname,
          user.instagram = $instagram,
          user.num_followers = toInteger($num_followers),
          user.num_following = toInteger($num_following),
          user.time_created = datetime($time_created),
          user.is_blocked_by_network = $is_blocked_by_network;
    `,
    {
      ...user,
      bio: sanitize(user.bio)
    }
  )
}

export const upsertFollowsRelationship = (
  tx: TransactionOrSession,
  relationship: {
    follower_id: number
    user_id: number
  }
) => {
  return tx.run(
    `
      MATCH (userA:User {user_id: toInteger($follower_id)})
      MATCH (userB:User {user_id: toInteger($user_id)})
      MERGE (userA)-[op:FOLLOWS]->(userB)
      RETURN op;
    `,
    relationship
  )
}

export const upsertInvitedByUserRelationship = (
  tx: TransactionOrSession,
  relationship: {
    invited_by_user_profile_id: number
    user_id: number
  }
) => {
  return tx.run(
    `
      MATCH (userA:User {user_id: toInteger($invited_by_user_profile_id)})
      MATCH (userB:User {user_id: toInteger($user_id)})
      MERGE (userB)-[op:INVITED_BY_USER]->(userA)
      RETURN op;
    `,
    relationship
  )
}

export const getUserById = (tx: TransactionOrSession, userId: string) => {
  return tx.run(
    `
      MATCH (u:User)
      WHERE u.user_id = toInteger($userId)
      RETURN u
      LIMIT 1
    `,
    { userId }
  )
}

export const getUserFollowersById = (
  tx: TransactionOrSession,
  userId: string,
  {
    limit = 1000,
    skip = 0
  }: {
    limit?: number
    skip?: number
  } = {}
) => {
  return tx.run(
    `
      MATCH (follower:User)-[op:FOLLOWS]->(u:User { user_id: toInteger($userId) })
      RETURN follower
      ORDER BY follower.user_id
      SKIP ${skip}
      LIMIT ${limit}
    `,
    { userId }
  )
}

export const getFollowingUsersById = (
  tx: TransactionOrSession,
  userId: string,
  {
    limit = 1000,
    skip = 0
  }: {
    limit?: number
    skip?: number
  } = {}
) => {
  return tx.run(
    `
      MATCH (u:User { user_id: toInteger($userId) })-[op:FOLLOWS]->(following:User)
      RETURN following
      ORDER BY following.user_id
      SKIP ${skip}
      LIMIT ${limit}
    `,
    { userId }
  )
}

export const getNumFollowersById = (
  tx: TransactionOrSession,
  userId: string
) => {
  return tx.run(
    `
      MATCH (follower:User)-[op:FOLLOWS]->(u:User { user_id: toInteger($userId) })
      RETURN count(op)
    `,
    { userId }
  )
}

export const getNumFollowingById = (
  tx: TransactionOrSession,
  userId: string
) => {
  return tx.run(
    `
      MATCH (follower:User { user_id: toInteger($userId) })-[op:FOLLOWS]->(user:User)
      RETURN count(op)
    `,
    { userId }
  )
}

export const getNumUsers = (tx: TransactionOrSession) => {
  return tx.run(
    `
      MATCH (u:User)
      RETURN count(*)
    `
  )
}

export const getNumFollowers = (tx: TransactionOrSession) => {
  return tx.run(
    `
      MATCH (f:User)-[op:FOLLOWS]->(u:User)
      RETURN count(op)
    `
  )
}

export const getNumUserInvites = (tx: TransactionOrSession) => {
  return tx.run(
    `
      MATCH (a:User)-[op:INVITED_BY_USER]->(b:User)
      RETURN count(op)
    `
  )
}

export const getNumUsersInvitedById = (
  tx: TransactionOrSession,
  userId: string
) => {
  return tx.run(
    `
      MATCH (user:User)-[op:INVITED_BY_USER]->(u:User { user_id: toInteger($userId) })
      RETURN count(op)
    `,
    { userId }
  )
}

// this should always be 0 or 1
export const getNumInvitesForUserById = (
  tx: TransactionOrSession,
  userId: string
) => {
  return tx.run(
    `
      MATCH (u:User { user_id: toInteger($userId) })-[op:INVITED_BY_USER]->(user:User)
      RETURN count(op)
    `,
    { userId }
  )
}

export const getUsersInvitedById = (
  tx: TransactionOrSession,
  userId: string,
  {
    limit = 1000,
    skip = 0
  }: {
    limit?: number
    skip?: number
  } = {}
) => {
  return tx.run(
    `
      MATCH (user:User)-[op:INVITED_BY_USER]->(u:User { user_id: toInteger($userId) })
      RETURN user
      ORDER BY user.user_id
      SKIP ${skip}
      LIMIT ${limit}
    `,
    { userId }
  )
}

package com.musicqueue

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.HttpRequestRetry
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.util.UUID

private const val API_BASE = "https://www.qobuz.com/api.json/0.2"
private const val DEFAULT_LIMIT = 20
private const val MAX_LIMIT = 200

class QobuzClient(
    private val httpClient: HttpClient,
    private val appId: String
) {
    init {
        require(appId.isNotBlank()) { "QOBUZ_APP_ID is required." }
    }

    suspend fun searchTracks(
        query: String,
        offset: Int = 0,
        limit: Int = DEFAULT_LIMIT
    ): SearchResponse {
        if (query.isBlank()) {
            throw IllegalArgumentException("Query cannot be blank.")
        }

        val safeOffset = offset.coerceAtLeast(0)
        val safeLimit = limit.coerceIn(1, MAX_LIMIT)

        val response: HttpResponse = httpClient.get("$API_BASE/search/getResults") {
            url {
                parameters.append("app_id", appId)
                parameters.append("query", query.trim())
                parameters.append("limit", safeLimit.toString())
                parameters.append("offset", safeOffset.toString())
            }
        }

        if (!response.status.isSuccess()) {
            throw QobuzServiceException("Qobuz responded with ${response.status}")
        }

        val payload = response.body<QobuzSearchEnvelope>()
        val tracks = payload.tracks?.items.orEmpty()
        val total = payload.tracks?.total ?: tracks.size

        return SearchResponse(
            items = tracks.map(::normalizeTrack),
            total = total
        )
    }

    private fun normalizeTrack(track: QobuzTrack): TrackResult {
        val cover =
            track.album?.image?.small
                ?: track.album?.cover
                ?: track.image?.small
                ?: track.coverUrl

        return TrackResult(
            id = track.id?.toString() ?: UUID.randomUUID().toString(),
            title = track.title?.ifBlank { null } ?: "Unknown title",
            artist = track.artist?.name
                ?: track.performer?.name
                ?: "Unknown artist",
            album = track.album?.title,
            cover = cover
        )
    }
}

class QobuzServiceException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

fun createQobuzHttpClient(): HttpClient =
    HttpClient(CIO) {
        install(ContentNegotiation) {
            json(
                Json {
                    ignoreUnknownKeys = true
                    explicitNulls = false
                }
            )
        }
        install(HttpTimeout) {
            requestTimeoutMillis = 10_000
            connectTimeoutMillis = 5_000
        }
        install(HttpRequestRetry) {
            retryOnServerErrors(maxRetries = 2)
            exponentialDelay()
        }
        install(Logging) {
            logger = Logger.SIMPLE
            level = LogLevel.INFO
        }
        defaultRequest {
            header(HttpHeaders.Accept, ContentType.Application.Json)
        }
        expectSuccess = false
    }

@Serializable
data class SearchResponse(
    val items: List<TrackResult>,
    val total: Int
)

@Serializable
data class TrackResult(
    val id: String,
    val title: String,
    val artist: String,
    val album: String? = null,
    val cover: String? = null
)

@Serializable
data class QobuzSearchEnvelope(
    val tracks: QobuzTracksSection? = null
)

@Serializable
data class QobuzTracksSection(
    val items: List<QobuzTrack> = emptyList(),
    val total: Int? = null
)

@Serializable
data class QobuzTrack(
    val id: Int? = null,
    val title: String? = null,
    val artist: QobuzArtist? = null,
    val performer: QobuzArtist? = null,
    val album: QobuzAlbum? = null,
    val image: QobuzImage? = null,
    @SerialName("cover_url") val coverUrl: String? = null
)

@Serializable
data class QobuzArtist(
    val id: Int? = null,
    val name: String? = null
)

@Serializable
data class QobuzAlbum(
    val title: String? = null,
    val image: QobuzImage? = null,
    val cover: String? = null
)

@Serializable
data class QobuzImage(
    val small: String? = null,
    val thumbnail: String? = null,
    val large: String? = null
)



